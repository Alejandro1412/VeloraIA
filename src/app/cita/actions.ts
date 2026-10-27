"use server";

import { getBusiness } from "@/lib/accounts";
import { getAvailability, rescheduleAppointment, setAppointmentStatus } from "@/lib/booking";
import { BookingError } from "@/lib/domain/booking-errors";
import { localToUtc } from "@/lib/domain/time";
import { getAppointment, getSettings } from "@/lib/data/store";
import { onAppointmentEvent } from "@/lib/events";
import { verifyLink } from "@/lib/links";
import { DEMO_BUSINESS_ID, isValidBusinessId, withBusiness } from "@/lib/tenant";

type Ref = { businessId: string; appointmentId: string; token: string };
type Result = { ok?: boolean; error?: string };

/** Runs `fn` for the appointment only when the signed link is valid and the appointment is still upcoming. */
async function guarded<T>(ref: Ref, fn: () => Promise<T>): Promise<T | { error: string }> {
  if (!isValidBusinessId(ref.businessId) || !verifyLink("cita", ref.businessId, ref.appointmentId, ref.token)) {
    return { error: "Este enlace no es válido." };
  }
  if (ref.businessId !== DEMO_BUSINESS_ID && !(await getBusiness(ref.businessId))) return { error: "Este enlace no es válido." };
  return withBusiness(ref.businessId, async () => {
    const apt = await getAppointment(ref.appointmentId);
    if (!apt) return { error: "No encontramos esta cita." };
    if (apt.status === "cancelled" || new Date(apt.start) < new Date()) return { error: "Esta cita ya no se puede cambiar." };
    return fn();
  });
}

export async function confirmFromLink(ref: Ref): Promise<Result> {
  return guarded(ref, async () => {
    const apt = await setAppointmentStatus(ref.appointmentId, "confirmed");
    await onAppointmentEvent("confirmed", apt);
    return { ok: true };
  });
}

export async function cancelFromLink(ref: Ref): Promise<Result> {
  return guarded(ref, async () => {
    await setAppointmentStatus(ref.appointmentId, "cancelled");
    return { ok: true };
  });
}

export async function slotsFromLink(ref: Ref, date: string): Promise<string[] | { error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return guarded(ref, async () => {
    const apt = (await getAppointment(ref.appointmentId))!;
    try {
      return (await getAvailability(apt.serviceId, date, { excludeAppointmentId: apt.id })).map((s) => s.time);
    } catch {
      return [];
    }
  });
}

export async function moveFromLink(ref: Ref, date: string, time: string): Promise<Result> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Elige un horario." };
  return guarded(ref, async () => {
    const settings = await getSettings();
    try {
      await rescheduleAppointment(ref.appointmentId, localToUtc(date, time, settings.utcOffsetMinutes).toISOString());
      return { ok: true };
    } catch (err) {
      if (err instanceof BookingError) return { error: "Ese horario se acaba de ocupar. Elige otro." };
      throw err;
    }
  });
}
