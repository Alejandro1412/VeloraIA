import "server-only";
import { formatDateEs, formatTimeEs, localParts } from "./domain/time";
import type { Appointment, Conversation } from "./domain/types";
import {
  addNotification,
  getCustomer,
  getService,
  getSettings,
  listStaff,
  listWaitlist,
  saveWaitlistEntry,
} from "./data/store";
import { emailConfigured, emailLayout, sendEmail } from "./email";
import { sendText, whatsappConfigured } from "./channels/whatsapp";
import { siteUrl } from "./site";

/**
 * Side effects of agenda changes: the owner's notification feed, email and
 * WhatsApp alerts, and offering freed slots to the waitlist.
 * Never throws: a failed alert must not break a booking.
 */

async function alertOwner(subject: string, lines: string[], path: string) {
  const settings = await getSettings();
  const url = `${siteUrl()}${path}`;
  const tasks: Promise<unknown>[] = [];
  if (settings.notifyEmail && emailConfigured()) {
    tasks.push(
      sendEmail({
        to: settings.notifyEmail,
        subject,
        text: `${lines.join("\n")}\n\n${url}`,
        html: emailLayout({ title: subject, paragraphs: lines, cta: { label: "Abrir el panel", url } }),
      }),
    );
  }
  const from = settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (settings.notifyWhatsapp && whatsappConfigured() && from) {
    tasks.push(sendText(settings.notifyWhatsapp, `*${subject}*\n${lines.join("\n")}\n${url}`, from).catch(() => undefined));
  }
  await Promise.allSettled(tasks);
}

async function describe(apt: Appointment) {
  const [settings, service, customer, staff] = await Promise.all([
    getSettings(),
    getService(apt.serviceId),
    getCustomer(apt.customerId),
    listStaff(),
  ]);
  const p = localParts(apt.start, settings.utcOffsetMinutes);
  const who = staff.find((s) => s.id === apt.staffId)?.name;
  return {
    settings,
    service,
    customer,
    local: p,
    when: `${formatDateEs(p.date)} a las ${formatTimeEs(p.time)}`,
    line: `${customer?.name || "Cliente"} · ${service?.name ?? "Servicio"}${who ? ` con ${who}` : ""}`,
  };
}

export async function onAppointmentEvent(
  kind: "booked" | "rescheduled" | "cancelled" | "confirmed",
  apt: Appointment,
  opts: { notifyOwner?: boolean } = {},
) {
  try {
    const d = await describe(apt);
    const fromCustomer = apt.source !== "manual";
    const href = `/app/agenda?week=${d.local.date}`;
    const titles = { booked: "Nueva cita", rescheduled: "Cita reprogramada", cancelled: "Cita cancelada", confirmed: "Cita confirmada" } as const;
    if (kind === "confirmed") {
      // Confirmations are good news: panel feed only, no email/WhatsApp noise.
      await addNotification({ kind, title: `${titles[kind]}: ${d.when}`, body: d.line, href });
      return;
    }
    const shouldAlert = (kind === "booked" ? fromCustomer : true) && opts.notifyOwner !== false;
    if (shouldAlert) {
      await addNotification({ kind, title: `${titles[kind]}: ${d.when}`, body: d.line, href });
      await alertOwner(`${titles[kind]} · ${d.when}`, [d.line, `Canal: ${apt.source}`], href);
    }
    if (kind === "cancelled") await offerToWaitlist(apt, d.local.date, d.when);
  } catch (err) {
    console.error("[velora] event handling failed", err);
  }
}

/** When a slot frees up, offer it to the first person waiting for that day and service. */
async function offerToWaitlist(apt: Appointment, date: string, when: string) {
  const waiting = (await listWaitlist())
    .filter((w) => w.date === date && w.serviceId === apt.serviceId && !w.notifiedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const first = waiting[0];
  if (!first) return;
  const settings = await getSettings();
  const from = settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const canMessage = whatsappConfigured() && from && /^\+\d{8,15}$/.test(first.customerPhone);
  if (canMessage) {
    await sendText(
      first.customerPhone,
      `¡Hola ${first.customerName.split(" ")[0] || ""}! Se liberó un espacio el ${when} en ${settings.name}. ¿Lo quieres? Respóndeme "sí, agéndame" y te lo separo 🙌`,
      from,
    ).catch(() => undefined);
  }
  await saveWaitlistEntry({ ...first, notifiedAt: new Date().toISOString() });
  await addNotification({
    kind: "waitlist",
    title: "Se liberó un espacio con lista de espera",
    body: `${first.customerName || first.customerPhone} esperaba un cupo el ${when}${canMessage ? ". Ya le avisamos por WhatsApp." : ". Contáctalo para ofrecérselo."}`,
    href: `/app/conversaciones?c=${first.conversationId}`,
  });
}

export async function onHandoff(conversation: Conversation) {
  try {
    const name = conversation.customerName || "Un cliente";
    const href = `/app/conversaciones?c=${conversation.id}`;
    await addNotification({ kind: "handoff", title: `${name} quiere hablar con tu equipo`, body: conversation.lastMessage, href });
    await alertOwner(`${name} quiere hablar con tu equipo`, [`Último mensaje: "${conversation.lastMessage}"`], href);
  } catch (err) {
    console.error("[velora] handoff alert failed", err);
  }
}

export async function onDepositPaid(apt: Appointment) {
  try {
    const d = await describe(apt);
    const href = `/app/agenda?week=${d.local.date}`;
    await addNotification({ kind: "deposit_paid", title: `Anticipo pagado · ${d.when}`, body: d.line, href });
    await alertOwner(`Anticipo pagado · ${d.when}`, [d.line], href);
  } catch (err) {
    console.error("[velora] deposit alert failed", err);
  }
}

/** A customer rated their visit. Low scores reach the owner right away. */
export async function onFeedback(apt: Appointment, rating: number, comment: string) {
  try {
    const d = await describe(apt);
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const href = `/app/clientes?c=${apt.customerId}`;
    await addNotification({ kind: "feedback", title: `${stars} ${d.customer?.name || "Cliente"}`, body: comment || d.line, href });
    if (rating <= 3) {
      await alertOwner(`Calificación baja (${rating}/5) · ${d.customer?.name || "Cliente"}`, [d.line, d.when, comment ? `“${comment}”` : "Sin comentario"], href);
    }
  } catch (err) {
    console.error("[velora] feedback handling failed", err);
  }
}
