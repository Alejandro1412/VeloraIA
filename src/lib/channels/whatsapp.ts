import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** WhatsApp Business Cloud API (Meta) client. */

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";

/** IONEX operates one Meta app; each business can have its own phone number. */
export const whatsappConfigured = () => !!process.env.WHATSAPP_TOKEN;

async function post(body: Record<string, unknown>, fromNumberId?: string) {
  const numberId = fromNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!numberId) throw new Error("Este negocio no tiene un número de WhatsApp conectado");
  const url = `https://graph.facebook.com/${API_VERSION}/${numberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  return res.json();
}

export function sendText(to: string, text: string, fromNumberId?: string) {
  return post({ to: to.replace(/\D/g, ""), type: "text", text: { body: text, preview_url: true } }, fromNumberId);
}

/**
 * Template messages are required to start a conversation outside the
 * 24-hour customer service window (e.g. appointment reminders).
 */
export function sendTemplate(to: string, name: string, params: string[], language = "es", fromNumberId?: string) {
  return post({
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name,
      language: { code: language },
      components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
    },
  }, fromNumberId);
}

export function markRead(messageId: string, fromNumberId?: string) {
  return post({ status: "read", message_id: messageId }, fromNumberId).catch(() => undefined);
}

/** Verifies Meta's X-Hub-Signature-256 header against the raw body. */
export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // signature check is opt-in until the secret is configured
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const received = Buffer.from(header.slice(7));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export interface InboundWhatsApp {
  id: string;
  /** Meta phone-number ID that received the message (identifies the business). */
  to: string;
  from: string;
  name?: string;
  text: string | null;
  type: string;
}

/** Flattens Meta's nested webhook payload into the messages we care about. */
export function parseWebhook(payload: unknown): InboundWhatsApp[] {
  const out: InboundWhatsApp[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as { changes?: { value?: Record<string, unknown> }[] }[]) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const to = String((value.metadata as { phone_number_id?: string } | undefined)?.phone_number_id ?? "");
      const contacts = (value.contacts as { wa_id: string; profile?: { name?: string } }[]) ?? [];
      for (const m of (value.messages as Record<string, unknown>[]) ?? []) {
        const from = String(m.from);
        const type = String(m.type);
        let text: string | null = null;
        if (type === "text") text = (m.text as { body: string }).body;
        else if (type === "button") text = (m.button as { text: string }).text;
        else if (type === "interactive") {
          const i = m.interactive as { button_reply?: { title: string }; list_reply?: { title: string } };
          text = i.button_reply?.title ?? i.list_reply?.title ?? null;
        }
        out.push({
          id: String(m.id),
          to,
          from,
          name: contacts.find((c) => c.wa_id === from)?.profile?.name,
          text,
          type,
        });
      }
    }
  }
  return out;
}
