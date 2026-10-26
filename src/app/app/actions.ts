"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { destroySession, requireSession } from "@/lib/auth";
import { renameBusiness } from "@/lib/accounts";
import { getRepo } from "@/lib/data/repo";
import { bookAppointment, getAvailability, rescheduleAppointment, setAppointmentStatus } from "@/lib/booking";
import { BookingError } from "@/lib/domain/booking-errors";
import { localToUtc } from "@/lib/domain/time";
import type { AppointmentStatus, DayHours } from "@/lib/domain/types";
import {
  addMessage,
  deleteService,
  getConversation,
  getSettings,
  saveConversation,
  saveService,
  saveSettings,
} from "@/lib/data/store";
import { sendText, whatsappConfigured } from "@/lib/channels/whatsapp";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const refresh = () => revalidatePath("/app", "layout");

/* ---------------------------------- auth ---------------------------------- */

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ------------------------------ appointments ------------------------------ */

export async function setStatusAction(id: string, status: AppointmentStatus): Promise<ActionState> {
  await requireSession();
  await setAppointmentStatus(id, status);
  refresh();
  return { ok: true };
}

export async function slotsAction(serviceId: string, date: string): Promise<string[]> {
  await requireSession();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  try {
    return (await getAvailability(serviceId, date)).map((s) => s.time);
  } catch {
    return [];
  }
}

const NewAppointment = z.object({
  serviceId: z.string().min(1, "Elige un servicio"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Elige una hora"),
  name: z.string().trim().min(2, "Escribe el nombre del cliente"),
  phone: z.string().trim().regex(/^\+?[\d\s-]{7,16}$/, "Escribe un celular válido, por ejemplo +57 300 123 4567"),
  notes: z.string().max(500).optional(),
  force: z.literal("on").optional(),
});

export async function createAppointmentAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = NewAppointment.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  const d = parsed.data;
  const settings = await getSettings();
  const phone = d.phone.startsWith("+") ? d.phone : `+57${d.phone.replace(/\D/g, "")}`;
  try {
    await bookAppointment({
      serviceId: d.serviceId,
      start: localToUtc(d.date, d.time, settings.utcOffsetMinutes).toISOString(),
      name: d.name,
      phone,
      source: "manual",
      notes: d.notes,
      skipAvailabilityCheck: d.force === "on",
    });
  } catch (err) {
    if (err instanceof BookingError) return { error: `${err.message}. Elige otra hora o marca “Agendar aunque se cruce”.` };
    throw err;
  }
  refresh();
  return { ok: true, message: "Cita agendada" };
}

export async function rescheduleAction(id: string, date: string, time: string): Promise<ActionState> {
  await requireSession();
  const settings = await getSettings();
  try {
    await rescheduleAppointment(id, localToUtc(date, time, settings.utcOffsetMinutes).toISOString());
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
  refresh();
  return { ok: true };
}

/* ------------------------------ conversations ----------------------------- */

export async function staffReplyAction(conversationId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const text = String(form.get("text") ?? "").trim();
  if (!text) return { error: "Escribe un mensaje" };
  const conv = await getConversation(conversationId);
  if (!conv) return { error: "La conversación ya no existe" };

  if (conv.channel === "whatsapp") {
    const settings = await getSettings();
    const fromNumber = settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!whatsappConfigured() || !fromNumber) return { error: "Conecta tu número de WhatsApp en Ajustes para responder desde aquí." };
    try {
      await sendText(conv.customerPhone, text, fromNumber);
    } catch (err) {
      return { error: `WhatsApp rechazó el mensaje: ${(err as Error).message.slice(0, 160)}` };
    }
  }
  await addMessage(conv.id, "staff", text);
  await saveConversation({ ...conv, humanTakeover: true, lastMessage: text, unread: 0, updatedAt: new Date().toISOString() });
  refresh();
  return { ok: true };
}

export async function setTakeoverAction(conversationId: string, takeover: boolean) {
  await requireSession();
  const conv = await getConversation(conversationId);
  if (!conv) return;
  await saveConversation({ ...conv, humanTakeover: takeover, state: { step: "idle", intent: null } });
  refresh();
}

export async function markReadAction(conversationId: string) {
  await requireSession();
  const conv = await getConversation(conversationId);
  if (conv && conv.unread) await saveConversation({ ...conv, unread: 0 });
}

/* -------------------------------- services -------------------------------- */

const ServiceInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escribe el nombre del servicio"),
  durationMinutes: z.coerce.number().int().min(5, "La duración mínima es 5 minutos").max(600),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  description: z.string().trim().max(300).default(""),
  keywords: z.string().default(""),
  active: z.literal("on").optional(),
});

export async function saveServiceAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = ServiceInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  await saveService({
    id: d.id || undefined,
    name: d.name,
    durationMinutes: d.durationMinutes,
    price: d.price,
    description: d.description,
    keywords: d.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
    active: d.active === "on",
  });
  refresh();
  return { ok: true, message: "Servicio guardado" };
}

export async function deleteServiceAction(id: string) {
  await requireSession();
  await deleteService(id);
  refresh();
}

/* -------------------------------- settings -------------------------------- */

const time = z.string().regex(/^\d{2}:\d{2}$/);

export async function saveSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireSession();
  const current = await getSettings();
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const num = (k: string, fallback: number) => {
    const n = Number(form.get(k));
    return Number.isFinite(n) ? n : fallback;
  };

  const hours: (DayHours | null)[] = [];
  for (let d = 0; d < 7; d++) {
    if (form.get(`day${d}_open`) !== "on") {
      hours.push(null);
      continue;
    }
    const open = str(`day${d}_from`);
    const close = str(`day${d}_to`);
    const bStart = str(`day${d}_break_from`);
    const bEnd = str(`day${d}_break_to`);
    if (!time.safeParse(open).success || !time.safeParse(close).success || open >= close) {
      return { error: "Revisa los horarios: la hora de cierre debe ser posterior a la de apertura." };
    }
    hours.push({
      open,
      close,
      breaks: time.safeParse(bStart).success && time.safeParse(bEnd).success && bStart < bEnd ? [{ start: bStart, end: bEnd }] : [],
    });
  }

  const name = str("name");
  if (name.length < 2) return { error: "Escribe el nombre del negocio" };

  // Routes inbound WhatsApp messages for this number to this business.
  const waNumberId = session.demo ? (current.whatsappPhoneNumberId ?? "") : str("whatsappPhoneNumberId").replace(/\D/g, "");
  if (waNumberId !== (current.whatsappPhoneNumberId ?? "")) {
    const repo = getRepo();
    if (waNumberId) {
      const owner = await repo.get<{ businessId: string }>("wa_number", waNumberId);
      if (owner && owner.businessId !== session.businessId) return { error: "Ese número de WhatsApp ya está conectado a otro negocio." };
      await repo.put("wa_number", waNumberId, { businessId: session.businessId });
    }
    if (current.whatsappPhoneNumberId) await repo.remove("wa_number", current.whatsappPhoneNumberId);
  }

  await saveSettings({
    ...current,
    name,
    vertical: str("vertical") || current.vertical,
    phone: str("phone"),
    address: str("address"),
    mapsUrl: str("mapsUrl"),
    assistantName: str("assistantName") || "Sofía",
    welcomeMessage: str("welcomeMessage") || current.welcomeMessage,
    extraInstructions: str("extraInstructions"),
    capacity: Math.max(1, Math.min(50, num("capacity", current.capacity))),
    slotStepMinutes: [10, 15, 20, 30, 60].includes(num("slotStepMinutes", 30)) ? num("slotStepMinutes", 30) : 30,
    minNoticeMinutes: Math.max(0, num("minNoticeMinutes", current.minNoticeMinutes)),
    maxDaysAhead: Math.max(1, Math.min(180, num("maxDaysAhead", current.maxDaysAhead))),
    reminderHoursBefore: Math.max(1, Math.min(72, num("reminderHoursBefore", current.reminderHoursBefore))),
    hours,
    whatsappPhoneNumberId: waNumberId,
  });
  if (!session.demo) await renameBusiness(session.businessId, name);
  refresh();
  return { ok: true, message: "Cambios guardados" };
}
