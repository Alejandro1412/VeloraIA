import { after, NextResponse, type NextRequest } from "next/server";
import { handleIncoming } from "@/lib/agent";
import { markRead, parseWebhook, sendText, verifySignature, whatsappConfigured } from "@/lib/channels/whatsapp";
import { getRepo } from "@/lib/data/repo";
import { DEMO_BUSINESS_ID, withBusiness } from "@/lib/tenant";

/** Meta webhook verification handshake. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === expected) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** The business that owns a WhatsApp number (set in each business' Ajustes). */
async function businessForNumber(numberId: string) {
  const owner = numberId ? await getRepo().get<{ businessId: string }>("wa_number", numberId) : null;
  return owner?.businessId ?? process.env.WHATSAPP_DEFAULT_BUSINESS_ID ?? DEMO_BUSINESS_ID;
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
        const businessId = await businessForNumber(m.to);
        if (whatsappConfigured()) await markRead(m.id, m.to);
        const phone = `+${m.from}`;
        const result =
          m.text === null
            ? { reply: "Por ahora solo puedo leer mensajes de texto 🙏 ¿Me lo escribes, por favor?" }
            : await withBusiness(businessId, () =>
                handleIncoming({ conversationId: `wa_${m.from}`, channel: "whatsapp", phone, profileName: m.name, text: m.text! }),
              );
        if (result.reply && whatsappConfigured()) await sendText(phone, result.reply, m.to);
      } catch (err) {
        console.error("[velora] whatsapp processing failed", err);
      }
    }
  });

  return NextResponse.json({ received: inbound.length });
}
