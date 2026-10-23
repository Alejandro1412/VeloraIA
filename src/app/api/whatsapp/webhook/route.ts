import { after, NextResponse, type NextRequest } from "next/server";
import { handleIncoming } from "@/lib/agent";
import { markRead, parseWebhook, sendText, verifySignature, whatsappConfigured } from "@/lib/channels/whatsapp";

/** Meta webhook verification handshake. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === expected) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

const seen = new Set<string>();

/** Incoming WhatsApp messages. Acknowledge fast, process after the response. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const inbound = parseWebhook(payload).filter((m) => !seen.has(m.id));
  inbound.forEach((m) => seen.add(m.id));
  if (seen.size > 2000) seen.clear();

  after(async () => {
    for (const m of inbound) {
      try {
        if (whatsappConfigured()) await markRead(m.id);
        const phone = `+${m.from}`;
        const result =
          m.text === null
            ? { reply: "Por ahora solo puedo leer mensajes de texto 🙏 ¿Me lo escribes, por favor?" }
            : await handleIncoming({ conversationId: `wa_${m.from}`, channel: "whatsapp", phone, profileName: m.name, text: m.text });
        if (result.reply && whatsappConfigured()) await sendText(phone, result.reply);
      } catch (err) {
        console.error("[velora] whatsapp processing failed", err);
      }
    }
  });

  return NextResponse.json({ received: inbound.length });
}
