import "server-only";
import { getSlots, type Slot } from "./domain/availability";
import { BookingError } from "./domain/booking-errors";
import { localParts } from "./domain/time";
import type { Appointment, AppointmentStatus, Channel } from "./domain/types";
import {
  getAppointment,
  getService,
  getSettings,
  listAppointments,
  saveAppointment,
  upsertCustomer,
} from "./data/store";
import { addDays } from "./domain/time";
import { localToUtc } from "./domain/time";

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

async function dayAgenda(date: string) {
  const settings = await getSettings();
  const from = localToUtc(addDays(date, -1), "00:00", settings.utcOffsetMinutes).toISOString();
  const to = localToUtc(addDays(date, 2), "00:00", settings.utcOffsetMinutes).toISOString();
  return { settings, appointments: await listAppointments({ from, to }) };
}

export async function getAvailability(serviceId: string, date: string, excludeAppointmentId?: string): Promise<Slot[]> {
  const service = await getService(serviceId);
  if (!service || !service.active) throw new BookingError("invalid_service", "Servicio no disponible");
  const { settings, appointments } = await dayAgenda(date);
  return getSlots({ date, service, settings, appointments, now: new Date(), excludeAppointmentId });
}

async function assertFree(serviceId: string, start: string, excludeAppointmentId?: string) {
  const settings = await getSettings();
  const date = localParts(start, settings.utcOffsetMinutes).date;
  const slots = await getAvailability(serviceId, date, excludeAppointmentId);
  const iso = new Date(start).toISOString();
  if (!slots.some((s) => s.start === iso)) throw new BookingError("slot_taken", "Ese horario ya no está disponible");
}

export async function bookAppointment(input: {
  serviceId: string;
  start: string;
  phone: string;
  name: string;
  source: Channel;
  notes?: string;
  skipAvailabilityCheck?: boolean;
}): Promise<Appointment> {
  return withLock(async () => {
    const service = await getService(input.serviceId);
    if (!service) throw new BookingError("invalid_service", "Servicio no encontrado");
    if (!input.skipAvailabilityCheck) await assertFree(input.serviceId, input.start);
    const customer = await upsertCustomer(input.phone, input.name);
    const start = new Date(input.start);
    return saveAppointment({
      serviceId: service.id,
      customerId: customer.id,
      start: start.toISOString(),
      end: new Date(start.getTime() + service.durationMinutes * 60_000).toISOString(),
      status: "booked",
      source: input.source,
      notes: input.notes ?? "",
      reminderSentAt: null,
    });
  });
}

export async function rescheduleAppointment(id: string, start: string): Promise<Appointment> {
  return withLock(async () => {
    const apt = await getAppointment(id);
    if (!apt) throw new BookingError("not_found", "Cita no encontrada");
    const service = await getService(apt.serviceId);
    await assertFree(apt.serviceId, start, id);
    const s = new Date(start);
    return saveAppointment({
      ...apt,
      start: s.toISOString(),
      end: new Date(s.getTime() + (service?.durationMinutes ?? 30) * 60_000).toISOString(),
      status: "booked",
      reminderSentAt: null,
    });
  });
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const apt = await getAppointment(id);
  if (!apt) throw new BookingError("not_found", "Cita no encontrada");
  return saveAppointment({ ...apt, status });
}

export const cancelAppointment = (id: string) => setAppointmentStatus(id, "cancelled");
export const confirmAppointment = (id: string) => setAppointmentStatus(id, "confirmed");
