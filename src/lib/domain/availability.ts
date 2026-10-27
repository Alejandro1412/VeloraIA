import { ACTIVE_STATUSES, type Appointment, type BusinessSettings, type Closure, type Service, type Staff } from "./types";
import { addDays, daysBetween, fromMinutes, localToUtc, localParts, toMinutes, weekdayOf } from "./time";

export interface Slot {
  start: string; // ISO UTC
  end: string; // ISO UTC
  time: string; // HH:mm local
  /** Professionals free for this slot (empty when the business has none configured). */
  staffIds: string[];
}

export interface SlotQuery {
  date: string; // YYYY-MM-DD local
  service: Pick<Service, "id" | "durationMinutes"> & Partial<Pick<Service, "days" | "bufferMinutes">>;
  settings: BusinessSettings;
  appointments: Appointment[];
  now: Date;
  staff?: Staff[];
  closures?: Closure[];
  /** Only consider this professional. */
  staffId?: string;
  /** Ignore this appointment when checking overlaps (used when rescheduling). */
  excludeAppointmentId?: string;
  /** Buffer (minutes) of each existing appointment's service. */
  bufferFor?: (serviceId: string) => number;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

const isClosed = (closures: Closure[] | undefined, date: string, staffId?: string) =>
  (closures ?? []).some((c) => date >= c.from && date <= c.to && (!c.staffId || c.staffId === staffId));

/** Professionals who can perform the service on that date. */
export function eligibleStaff(q: Pick<SlotQuery, "staff" | "closures" | "service" | "date" | "staffId">): Staff[] {
  const weekday = weekdayOf(q.date);
  return (q.staff ?? []).filter(
    (s) =>
      s.active &&
      (!q.staffId || s.id === q.staffId) &&
      (s.serviceIds.length === 0 || s.serviceIds.includes(q.service.id)) &&
      !s.daysOff.includes(weekday) &&
      !isClosed(q.closures, q.date, s.id),
  );
}

/**
 * Pure availability engine. Given business hours, breaks, closures, staff,
 * per-service rules and the existing agenda, returns every bookable start
 * time for a service on a day.
 *
 * - Without professionals, `settings.capacity` appointments may overlap.
 * - With professionals, a slot is free when an eligible professional is free;
 *   legacy appointments without a professional consume one generic seat.
 */
export function getSlots(q: SlotQuery): Slot[] {
  const { settings, service, now } = q;
  const today = localParts(now, settings.utcOffsetMinutes).date;
  const ahead = daysBetween(today, q.date);
  if (ahead < 0 || ahead > settings.maxDaysAhead) return [];
  if (isClosed(q.closures?.filter((c) => !c.staffId), q.date)) return [];

  const weekday = weekdayOf(q.date);
  const hours = settings.hours[weekday];
  if (!hours) return [];
  if (service.days && service.days.length > 0 && !service.days.includes(weekday)) return [];

  const usesStaff = (q.staff ?? []).some((s) => s.active);
  const knownStaff = new Set((q.staff ?? []).map((s) => s.id));
  const candidates = usesStaff ? eligibleStaff(q) : [];
  if (usesStaff && candidates.length === 0) return [];

  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const duration = service.durationMinutes;
  const ownBuffer = service.bufferMinutes ?? 0;
  const earliest = now.getTime() + settings.minNoticeMinutes * 60_000;
  const bufferOf = q.bufferFor ?? (() => 0);

  const busy = q.appointments
    .filter((a) => ACTIVE_STATUSES.includes(a.status) && a.id !== q.excludeAppointmentId)
    .map((a) => ({
      start: new Date(a.start).getTime(),
      end: new Date(a.end).getTime() + bufferOf(a.serviceId) * 60_000,
      staffId: a.staffId,
    }));

  const slots: Slot[] = [];
  for (let m = open; m + duration <= close; m += settings.slotStepMinutes) {
    const end = m + duration;
    if (hours.breaks.some((b) => overlaps(m, end, toMinutes(b.start), toMinutes(b.end)))) continue;

    const startUtc = localToUtc(q.date, fromMinutes(m), settings.utcOffsetMinutes).getTime();
    if (startUtc < earliest) continue;
    const endUtc = startUtc + duration * 60_000;
    const blockedUntil = endUtc + ownBuffer * 60_000;
    const clashing = busy.filter((b) => overlaps(startUtc, blockedUntil, b.start, b.end));

    if (!usesStaff) {
      if (clashing.length >= settings.capacity) continue;
      slots.push({ start: new Date(startUtc).toISOString(), end: new Date(endUtc).toISOString(), time: fromMinutes(m), staffIds: [] });
      continue;
    }

    const free = candidates.filter((s) => !clashing.some((b) => b.staffId === s.id));
    // Appointments without a (still existing) professional occupy one generic seat.
    const unassigned = clashing.filter((b) => !b.staffId || !knownStaff.has(b.staffId)).length;
    if (free.length - unassigned <= 0) continue;
    slots.push({
      start: new Date(startUtc).toISOString(),
      end: new Date(endUtc).toISOString(),
      time: fromMinutes(m),
      staffIds: free.map((s) => s.id),
    });
  }
  return slots;
}

/** Picks who attends: the requested professional if free, else the least busy free one. */
export function pickStaff(slot: Slot, appointments: Appointment[], preferred?: string): string | undefined {
  if (slot.staffIds.length === 0) return undefined;
  if (preferred && slot.staffIds.includes(preferred)) return preferred;
  const load = (id: string) => appointments.filter((a) => a.staffId === id && ACTIVE_STATUSES.includes(a.status)).length;
  return [...slot.staffIds].sort((a, b) => load(a) - load(b))[0];
}

/** Pick up to `max` slots spread across the day so options feel varied. */
export function spreadSlots(slots: Slot[], max = 6): Slot[] {
  if (slots.length <= max) return slots;
  const picked: Slot[] = [];
  const step = (slots.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) picked.push(slots[Math.round(i * step)]);
  return picked;
}

/** Slots closest to a desired local time on that day. */
export function nearestSlots(slots: Slot[], desired: string, max = 3): Slot[] {
  const target = toMinutes(desired);
  return [...slots]
    .sort((a, b) => Math.abs(toMinutes(a.time) - target) - Math.abs(toMinutes(b.time) - target))
    .slice(0, max)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** First days (from `from`) that still have room for the service. */
export function nextOpenDays(q: Omit<SlotQuery, "date">, from: string, count = 3): { date: string; slots: Slot[] }[] {
  const found: { date: string; slots: Slot[] }[] = [];
  for (let i = 0; i <= q.settings.maxDaysAhead && found.length < count; i++) {
    const date = addDays(from, i);
    const slots = getSlots({ ...q, date });
    if (slots.length) found.push({ date, slots });
  }
  return found;
}
