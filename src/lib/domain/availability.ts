import { ACTIVE_STATUSES, type Appointment, type BusinessSettings, type Service } from "./types";
import { addDays, daysBetween, fromMinutes, localParts, localToUtc, toMinutes, weekdayOf } from "./time";

export interface Slot {
  start: string; // ISO UTC
  end: string; // ISO UTC
  time: string; // HH:mm local
}

interface SlotQuery {
  date: string; // YYYY-MM-DD local
  service: Pick<Service, "durationMinutes">;
  settings: BusinessSettings;
  appointments: Appointment[];
  now: Date;
  /** Ignore this appointment when checking overlaps (used when rescheduling). */
  excludeAppointmentId?: string;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

/**
 * Pure availability engine. Given business hours, breaks, capacity and the
 * existing agenda, returns every bookable start time for a service on a day.
 */
export function getSlots(q: SlotQuery): Slot[] {
  const { settings, service, now } = q;
  const today = localParts(now, settings.utcOffsetMinutes).date;
  const ahead = daysBetween(today, q.date);
  if (ahead < 0 || ahead > settings.maxDaysAhead) return [];

  const hours = settings.hours[weekdayOf(q.date)];
  if (!hours) return [];

  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const duration = service.durationMinutes;
  const earliest = now.getTime() + settings.minNoticeMinutes * 60_000;

  const busy = q.appointments
    .filter((a) => ACTIVE_STATUSES.includes(a.status) && a.id !== q.excludeAppointmentId)
    .map((a) => [new Date(a.start).getTime(), new Date(a.end).getTime()] as const);

  const slots: Slot[] = [];
  for (let m = open; m + duration <= close; m += settings.slotStepMinutes) {
    const end = m + duration;
    if (hours.breaks.some((b) => overlaps(m, end, toMinutes(b.start), toMinutes(b.end)))) continue;

    const startUtc = localToUtc(q.date, fromMinutes(m), settings.utcOffsetMinutes).getTime();
    if (startUtc < earliest) continue;
    const endUtc = startUtc + duration * 60_000;

    const concurrent = busy.filter(([s, e]) => overlaps(startUtc, endUtc, s, e)).length;
    if (concurrent >= settings.capacity) continue;

    slots.push({
      start: new Date(startUtc).toISOString(),
      end: new Date(endUtc).toISOString(),
      time: fromMinutes(m),
    });
  }
  return slots;
}

export function isSlotAvailable(q: SlotQuery & { start: string }): boolean {
  return getSlots(q).some((s) => s.start === new Date(q.start).toISOString());
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
export function nextOpenDays(
  q: Omit<SlotQuery, "date">,
  from: string,
  count = 3,
): { date: string; slots: Slot[] }[] {
  const found: { date: string; slots: Slot[] }[] = [];
  for (let i = 0; i <= q.settings.maxDaysAhead && found.length < count; i++) {
    const date = addDays(from, i);
    const slots = getSlots({ ...q, date });
    if (slots.length) found.push({ date, slots });
  }
  return found;
}
