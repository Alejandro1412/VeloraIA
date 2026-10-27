import "server-only";
import { listAppointments, listCustomers, listServices, getSettings, saveAppointment, getAppointment } from "./data/store";
import { sendTemplate, sendText, whatsappConfigured } from "./channels/whatsapp";
import { siteUrl } from "./site";
import { currentBusinessId } from "./tenant";
import type { ReminderRun } from "./reminders";

export interface DueRecall {
  appointmentId: string;
  customerId: string;
  name: string;
  phone: string;
  service: string;
  lastVisit: string;
  dueDate: string;
  message: string;
}

const DAY = 86_400_000;

/**
 * Customers whose suggested return date for a service has arrived (within the
 * last 60 days, so we never dig up ancient history) and who have nothing booked.
 */
export async function dueRecalls(now = new Date()): Promise<DueRecall[]> {
  const [services, customers, appointments, settings] = await Promise.all([listServices(), listCustomers(), listAppointments(), getSettings()]);
  const withRecall = services.filter((s) => (s.recallMonths ?? 0) > 0);
  if (!withRecall.length) return [];
  const link = `${siteUrl()}/reservar/${await currentBusinessId()}`;
  const out: DueRecall[] = [];

  for (const c of customers) {
    if (!/^\+\d{8,15}$/.test(c.phone)) continue;
    const mine = appointments.filter((a) => a.customerId === c.id);
    if (mine.some((a) => (a.status === "booked" || a.status === "confirmed") && new Date(a.start) >= now)) continue;
    for (const s of withRecall) {
      const last = mine
        .filter((a) => a.serviceId === s.id && a.status === "completed")
        .sort((a, b) => b.start.localeCompare(a.start))[0];
      if (!last || last.recallSentAt) continue;
      const due = new Date(last.start);
      due.setMonth(due.getMonth() + (s.recallMonths ?? 0));
      if (due > now || now.getTime() - due.getTime() > 60 * DAY) continue;
      const first = c.name.split(" ")[0] || "";
      out.push({
        appointmentId: last.id,
        customerId: c.id,
        name: c.name,
        phone: c.phone,
        service: s.name,
        lastVisit: last.start,
        dueDate: due.toISOString(),
        message: `¡Hola ${first}! 👋 Ya es momento de tu próxima cita de ${s.name.toLowerCase()} en ${settings.name}. Elige tu horario aquí: ${link}`,
      });
      break; // one message per customer
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function markRecallSent(appointmentId: string) {
  const apt = await getAppointment(appointmentId);
  if (apt) await saveAppointment({ ...apt, recallSentAt: new Date().toISOString() });
}

/** Daily: sends due recalls by WhatsApp when the business' number is connected. */
export async function sendRecalls(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { checked: 0, sent: 0, skipped: 0, failed: [] };
  const settings = await getSettings();
  const from = settings.whatsappPhoneNumberId || undefined;
  if (!whatsappConfigured() || !(from || process.env.WHATSAPP_PHONE_NUMBER_ID)) return run;
  const due = await dueRecalls(now);
  run.checked = due.length;
  const link = `${siteUrl()}/reservar/${await currentBusinessId()}`;
  for (const r of due.slice(0, 200)) {
    try {
      const template = process.env.WHATSAPP_RECALL_TEMPLATE;
      if (template) await sendTemplate(r.phone, template, [r.name.split(" ")[0] || "", r.service.toLowerCase(), settings.name, link], "es", from);
      else await sendText(r.phone, r.message, from);
      await markRecallSent(r.appointmentId);
      run.sent++;
    } catch (err) {
      run.failed.push({ id: r.appointmentId, error: (err as Error).message });
    }
  }
  return run;
}
