import "server-only";
import { getSlots, pickStaff, type Slot } from "./domain/availability";
import { BookingError } from "./domain/booking-errors";
import { addDays, localParts, localToUtc } from "./domain/time";
import type { Appointment, AppointmentStatus, Channel } from "./domain/types";
import {
  getAppointment,
  getService,
  getSettings,
  listAppointments,
  listClosures,
  listServices,
  listStaff,
  saveAppointment,
  upsertCustomer,
} from "./data/store";
import { onAppointmentEvent } from "./events";
import { depositReference, wompiReady } from "./wompi";

/**
 * Booking service: the only place that mutates the agenda.
 * Re-validates availability under a per-process lock so two channels
 * (WhatsApp + voice) can't grab the same last seat simultaneously.
 */

let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function dayContext(date: string) {
  const settings = await getSettings();
  const from = localToUtc(addDays(date, -1), "00:00", settings.utcOffsetMinutes).toISOString();
  const to = localToUtc(addDays(date, 2), "00:00", settings.utcOffsetMinutes).toISOString();
  const [appointments, staff, closures, services] = await Promise.all([
    listAppointments({ from, to }),
    listStaff(),
    listClosures(),
    listServices(),
  ]);
  const buffers = new Map(services.map((s) => [s.id, s.bufferMinutes ?? 0]));
  return { settings, appointments, staff, closures, bufferFor: (id: string) => buffers.get(id) ?? 0 };
}

export async function getAvailability(
  serviceId: string,
  date: string,
  opts: { excludeAppointmentId?: string; staffId?: string } = {},
): Promise<Slot[]> {
  const service = await getService(serviceId);
  if (!service || !service.active) throw new BookingError("invalid_service", "Servicio no disponible");
  const ctx = await dayContext(date);
  return getSlots({ date, service, now: new Date(), ...ctx, ...opts });
}

/** Returns the free slot matching `start`, or throws. */
async function findFreeSlot(serviceId: string, start: string, opts: { excludeAppointmentId?: string; staffId?: string } = {}) {
  const settings = await getSettings();
  const date = localParts(start, settings.utcOffsetMinutes).date;
  const slots = await getAvailability(serviceId, date, opts);
  const iso = new Date(start).toISOString();
  const slot = slots.find((s) => s.start === iso);
  if (!slot) throw new BookingError("slot_taken", "Ese horario ya no está disponible");
  return slot;
}

export async function bookAppointment(input: {
  serviceId: string;
  start: string;
  phone: string;
  name: string;
  source: Channel;
  notes?: string;
  staffId?: string;
  skipAvailabilityCheck?: boolean;
}): Promise<Appointment> {
  const appointment = await withLock(async () => {
    const service = await getService(input.serviceId);
    if (!service) throw new BookingError("invalid_service", "Servicio no encontrado");

    let staffId = input.staffId;
    if (!input.skipAvailabilityCheck) {
      const slot = await findFreeSlot(input.serviceId, input.start, { staffId: input.staffId });
      const settings = await getSettings();
      const date = localParts(input.start, settings.utcOffsetMinutes).date;
      const { appointments } = await dayContext(date);
      staffId = pickStaff(slot, appointments, input.staffId);
    }

    const settings = await getSettings();
    const customer = await upsertCustomer(input.phone, input.name);
    const start = new Date(input.start);
    const needsDeposit = (service.depositAmount ?? 0) > 0 && wompiReady(settings) && input.source !== "manual";
    const draft = await saveAppointment({
      serviceId: service.id,
      customerId: customer.id,
      start: start.toISOString(),
      end: new Date(start.getTime() + service.durationMinutes * 60_000).toISOString(),
      status: "booked",
      source: input.source,
      notes: input.notes ?? "",
      reminderSentAt: null,
      staffId,
    });
    if (!needsDeposit) return draft;
    return saveAppointment({
      ...draft,
      deposit: { amount: service.depositAmount!, status: "pending", reference: depositReference(draft.id) },
    });
  });
  await onAppointmentEvent("booked", appointment);
  return appointment;
}

export async function rescheduleAppointment(id: string, start: string, opts: { notify?: boolean } = {}): Promise<Appointment> {
  const updated = await withLock(async () => {
    const apt = await getAppointment(id);
    if (!apt) throw new BookingError("not_found", "Cita no encontrada");
    const service = await getService(apt.serviceId);
    // Keep the same professional when possible; otherwise reassign.
    let slot: Slot;
    try {
      slot = await findFreeSlot(apt.serviceId, start, { excludeAppointmentId: id, staffId: apt.staffId });
    } catch {
      slot = await findFreeSlot(apt.serviceId, start, { excludeAppointmentId: id });
    }
    const s = new Date(start);
    return saveAppointment({
      ...apt,
      start: s.toISOString(),
      end: new Date(s.getTime() + (service?.durationMinutes ?? 30) * 60_000).toISOString(),
      status: "booked",
      reminderSentAt: null,
      staffId: slot.staffIds.length ? (slot.staffIds.includes(apt.staffId ?? "") ? apt.staffId : slot.staffIds[0]) : apt.staffId,
    });
  });
  if (opts.notify !== false) await onAppointmentEvent("rescheduled", updated);
  return updated;
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus, opts: { notify?: boolean } = {}): Promise<Appointment> {
  const apt = await getAppointment(id);
  if (!apt) throw new BookingError("not_found", "Cita no encontrada");
  const updated = await saveAppointment({ ...apt, status });
  if (status === "cancelled" && apt.status !== "cancelled") {
    await onAppointmentEvent("cancelled", updated, { notifyOwner: opts.notify !== false });
  }
  return updated;
}

export async function assignStaff(id: string, staffId: string | undefined) {
  const apt = await getAppointment(id);
  if (!apt) throw new BookingError("not_found", "Cita no encontrada");
  return saveAppointment({ ...apt, staffId });
}

export const cancelAppointment = (id: string) => setAppointmentStatus(id, "cancelled");
export const confirmAppointment = (id: string) => setAppointmentStatus(id, "confirmed");
