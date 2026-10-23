import "server-only";
import { addDays, formatDateEs, formatTimeEs, localParts } from "./domain/time";
import {
  addMessage,
  getCustomer,
  getOrCreateConversation,
  getSettings,
  listAppointments,
  listServices,
  saveAppointment,
  saveConversation,
} from "./data/store";
import { sendTemplate, sendText, whatsappConfigured } from "./channels/whatsapp";

export interface ReminderRun {
  checked: number;
  sent: number;
  skipped: number;
  failed: { id: string; error: string }[];
}

/**
 * Sends a WhatsApp reminder for every upcoming appointment inside the
 * reminder window that hasn't been reminded yet. Idempotent: safe to run
 * hourly or daily.
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderRun> {
  const settings = await getSettings();
  const services = await listServices();
  const windowEnd = new Date(now.getTime() + (settings.reminderHoursBefore + 12) * 3_600_000);
  const items = await listAppointments({ from: new Date(now.getTime() + 2 * 3_600_000).toISOString(), to: windowEnd.toISOString() });
  const due = items.filter((a) => a.status === "booked" && !a.reminderSentAt);
  const today = localParts(now, settings.utcOffsetMinutes).date;

  const run: ReminderRun = { checked: items.length, sent: 0, skipped: 0, failed: [] };
  for (const apt of due) {
    const customer = await getCustomer(apt.customerId);
    if (!customer || !/^\+\d{8,15}$/.test(customer.phone)) {
      run.skipped++;
      continue;
    }
    const service = services.find((s) => s.id === apt.serviceId);
    const local = localParts(apt.start, settings.utcOffsetMinutes);
    const day = local.date === addDays(today, 1) ? "mañana" : formatDateEs(local.date);
    const first = customer.name.split(" ")[0] || "";
    const text =
      `Hola ${first} 👋 Te recordamos tu cita de *${service?.name ?? "servicio"}* ${day} a las *${formatTimeEs(local.time)}* en ${settings.name}.\n\n` +
      `Responde *CONFIRMO* para confirmar, o escríbenos si necesitas moverla.`;

    try {
      if (whatsappConfigured()) {
        const template = process.env.WHATSAPP_REMINDER_TEMPLATE;
        if (template) await sendTemplate(customer.phone, template, [first, service?.name ?? "servicio", day, formatTimeEs(local.time)]);
        else await sendText(customer.phone, text);
      } else {
        run.skipped++;
        continue;
      }
      const conv = await getOrCreateConversation({
        id: `wa_${customer.phone.replace(/\D/g, "")}`,
        channel: "whatsapp",
        phone: customer.phone,
        name: customer.name,
      });
      await addMessage(conv.id, "assistant", text);
      await saveConversation({ ...conv, lastMessage: text, updatedAt: new Date().toISOString() });
      await saveAppointment({ ...apt, reminderSentAt: new Date().toISOString() });
      run.sent++;
    } catch (err) {
      run.failed.push({ id: apt.id, error: (err as Error).message });
    }
  }
  return run;
}
