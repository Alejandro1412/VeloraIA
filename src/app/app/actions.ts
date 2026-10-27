"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { destroySession, requireOwner, requireSession } from "@/lib/auth";
import { AccountError, createInvite, getBusiness, removeMember, renameBusiness, revokeInvite } from "@/lib/accounts";
import { getRepo } from "@/lib/data/repo";
import { assignStaff, bookAppointment, getAvailability, rescheduleAppointment, setAppointmentStatus } from "@/lib/booking";
import { PLANS, type PlanId } from "@/lib/billing";
import { checkoutUrl, ionexWompi, subscriptionReference } from "@/lib/wompi";
import { siteUrl } from "@/lib/site";
import { BookingError } from "@/lib/domain/booking-errors";
import { localToUtc } from "@/lib/domain/time";
import type { AppointmentStatus, DayHours } from "@/lib/domain/types";
import {
  addMessage,
  deleteClosure,
  deleteService,
  deleteStaff,
  getAppointment,
  getConversation,
  getCustomer,
  getSettings,
  listStaff,
  markNotificationsRead,
  saveAppointment,
  saveClosure,
  saveConversation,
  saveCustomer,
  saveService,
  saveSettings,
  saveStaff,
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
  // Changes made from the panel don't alert the owner (they made them).
  await setAppointmentStatus(id, status, { notify: false });
  refresh();
  return { ok: true };
}

export async function slotsAction(serviceId: string, date: string, staffId?: string): Promise<string[]> {
  await requireSession();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  try {
    return (await getAvailability(serviceId, date, { staffId: staffId || undefined })).map((s) => s.time);
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
  staffId: z.string().optional(),
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
      staffId: d.staffId || undefined,
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
    await rescheduleAppointment(id, localToUtc(date, time, settings.utcOffsetMinutes).toISOString(), { notify: false });
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
  refresh();
  return { ok: true };
}

export async function assignStaffAction(id: string, staffId: string): Promise<ActionState> {
  await requireSession();
  await assignStaff(id, staffId || undefined);
  refresh();
  return { ok: true };
}

export async function setDepositAction(id: string, status: "paid" | "waived"): Promise<ActionState> {
  await requireSession();
  const apt = await getAppointment(id);
  if (!apt?.deposit) return { error: "Esta cita no tiene anticipo" };
  await saveAppointment({
    ...apt,
    status: status === "paid" && apt.status === "booked" ? "confirmed" : apt.status,
    deposit: { ...apt.deposit, status, paidAt: status === "paid" ? new Date().toISOString() : apt.deposit.paidAt },
  });
  refresh();
  return { ok: true };
}

/* -------------------------------- customers ------------------------------- */

export async function saveCustomerNotesAction(customerId: string, notes: string): Promise<ActionState> {
  await requireSession();
  const customer = await getCustomer(customerId);
  if (!customer) return { error: "El cliente ya no existe" };
  await saveCustomer({ ...customer, notes: notes.slice(0, 2000) });
  refresh();
  return { ok: true, message: "Notas guardadas" };
}

/* ------------------------------ notifications ----------------------------- */

export async function markNotificationsReadAction() {
  await requireSession();
  await markNotificationsRead();
  refresh();
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
  bufferMinutes: z.coerce.number().int().min(0).max(240).default(0),
  depositAmount: z.coerce.number().min(0, "El anticipo no puede ser negativo").default(0),
});

export async function saveServiceAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner();
  const parsed = ServiceInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.depositAmount > d.price && d.price > 0) return { error: "El anticipo no puede ser mayor que el precio del servicio." };
  const days = form.getAll("days").map(Number).filter((n) => n >= 0 && n <= 6);
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
    bufferMinutes: d.bufferMinutes,
    depositAmount: d.depositAmount,
    days: days.length === 7 ? [] : days,
  });
  refresh();
  return { ok: true, message: "Servicio guardado" };
}

export async function deleteServiceAction(id: string) {
  await requireOwner();
  await deleteService(id);
  refresh();
}

/* -------------------------------- settings -------------------------------- */

const time = z.string().regex(/^\d{2}:\d{2}$/);

export async function saveSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireOwner();
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
    notifyEmail: str("notifyEmail") || undefined,
    notifyWhatsapp: str("notifyWhatsapp") ? `+${str("notifyWhatsapp").replace(/\D/g, "")}` : undefined,
    googleReviewUrl: /^https:\/\//.test(str("googleReviewUrl")) ? str("googleReviewUrl") : undefined,
  });
  if (!session.demo) await renameBusiness(session.businessId, name);
  refresh();
  return { ok: true, message: "Cambios guardados" };
}

/* ------------------------------ professionals ----------------------------- */

const StaffInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escribe el nombre").max(60),
  active: z.literal("on").optional(),
});

export async function saveStaffAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireOwner();
  const parsed = StaffInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!parsed.data.id) {
    const business = session.demo ? null : await getBusiness(session.businessId);
    const { subscriptionFor } = await import("@/lib/billing");
    const limit = business ? subscriptionFor(business).limits.staffLimit : 10;
    if ((await listStaff()).length >= limit) return { error: `Tu plan permite hasta ${limit} profesionales. Cambia de plan para agregar más.` };
  }
  await saveStaff({
    id: parsed.data.id || undefined,
    name: parsed.data.name,
    active: parsed.data.active === "on",
    serviceIds: form.getAll("serviceIds").map(String),
    daysOff: form.getAll("daysOff").map(Number).filter((n) => n >= 0 && n <= 6),
  });
  refresh();
  return { ok: true, message: "Profesional guardado" };
}

export async function deleteStaffAction(id: string) {
  await requireOwner();
  await deleteStaff(id);
  refresh();
}

/* -------------------------------- closures -------------------------------- */

const ClosureInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de inicio"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  reason: z.string().trim().max(80).default(""),
  staffId: z.string().optional(),
});

export async function addClosureAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = ClosureInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { from, reason, staffId } = parsed.data;
  const to = parsed.data.to || from;
  if (to < from) return { error: "La fecha final debe ser igual o posterior a la inicial." };
  await saveClosure({ from, to, reason: reason || "Cerrado", staffId: staffId || undefined });
  refresh();
  return { ok: true, message: "Día bloqueado" };
}

export async function deleteClosureAction(id: string) {
  await requireSession();
  await deleteClosure(id);
  refresh();
}

/* ---------------------------------- team ---------------------------------- */

export async function createInviteAction(): Promise<{ url?: string; error?: string }> {
  const session = await requireOwner();
  if (session.demo) return { error: "En la demostración no se pueden invitar personas. Crea tu cuenta para hacerlo." };
  const invite = await createInvite(session.businessId, session.email);
  refresh();
  return { url: `${siteUrl()}/invitacion/${invite.token}` };
}

export async function revokeInviteAction(token: string) {
  const session = await requireOwner();
  await revokeInvite(session.businessId, token);
  refresh();
}

export async function removeMemberAction(email: string): Promise<ActionState> {
  const session = await requireOwner();
  try {
    await removeMember(session.businessId, email);
  } catch (err) {
    if (err instanceof AccountError) return { error: err.message };
    throw err;
  }
  refresh();
  return { ok: true };
}

/* ------------------------------- integrations ------------------------------ */

export async function createCalendarTokenAction() {
  const session = await requireOwner();
  const settings = await getSettings();
  const repo = getRepo();
  if (settings.calendarToken) await repo.remove("calendar_token", settings.calendarToken);
  const token = randomBytes(24).toString("base64url");
  await repo.put("calendar_token", token, { businessId: session.businessId });
  await saveSettings({ ...settings, calendarToken: token });
  refresh();
}

const WompiInput = z.object({
  wompiPublicKey: z.string().trim().regex(/^pub_(prod|test)_[A-Za-z0-9]+$/, "La llave pública empieza por pub_prod_ o pub_test_"),
  wompiIntegritySecret: z.string().trim().regex(/^(prod|test)_integrity_[A-Za-z0-9]+$/, "El secreto de integridad empieza por prod_integrity_ o test_integrity_"),
  wompiEventsSecret: z.string().trim().regex(/^(prod|test)_events_[A-Za-z0-9]+$/, "El secreto de eventos empieza por prod_events_ o test_events_"),
});

/** Business' own Wompi keys for deposits. Secrets are write-only from the UI. */
export async function saveWompiAction(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireOwner();
  if (session.demo) return { error: "En la demostración no se pueden conectar pagos." };
  if (form.get("disconnect") === "1") {
    const settings = await getSettings();
    await saveSettings({ ...settings, wompiPublicKey: undefined, wompiIntegritySecret: undefined, wompiEventsSecret: undefined });
    refresh();
    return { ok: true, message: "Wompi desconectado" };
  }
  const parsed = WompiInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const settings = await getSettings();
  await saveSettings({ ...settings, ...parsed.data });
  refresh();
  return { ok: true, message: "Wompi conectado" };
}

/* --------------------------------- billing -------------------------------- */

export async function startCheckoutAction(plan: PlanId) {
  const session = await requireOwner();
  const keys = ionexWompi();
  if (!keys || session.demo || !(plan in PLANS)) redirect("/app/plan?pago=no-disponible");
  const url = checkoutUrl(keys, {
    reference: subscriptionReference(session.businessId, plan),
    amount: PLANS[plan].price,
    redirectUrl: `${siteUrl()}/app/plan?pago=enviado`,
    email: session.email || undefined,
  });
  redirect(url);
}
