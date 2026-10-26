import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleIncoming } from "@/lib/agent";
import { getBusiness } from "@/lib/accounts";
import { getConversation, listMessages } from "@/lib/data/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { DEMO_BUSINESS_ID, isValidBusinessId, withBusiness } from "@/lib/tenant";

const conversationIdSchema = z.string().regex(/^web_[a-z0-9]{8,40}$/i);

const Body = z.object({
  businessId: z.string().refine(isValidBusinessId).default(DEMO_BUSINESS_ID),
  conversationId: conversationIdSchema.optional(),
  message: z.string().trim().min(1).max(600),
});

async function businessExists(id: string) {
  return id === DEMO_BUSINESS_ID || !!(await getBusiness(id));
}

/** Public web chat endpoint: the landing demo and each business' booking page. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`chat:${clientIp(req.headers)}`, 25)) {
    return NextResponse.json({ error: "Demasiados mensajes. Espera un minuto e inténtalo de nuevo." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Escribe un mensaje de hasta 600 caracteres." }, { status: 400 });
  }
  const { businessId, message } = parsed.data;
  if (!(await businessExists(businessId))) {
    return NextResponse.json({ error: "Este enlace de reservas ya no está activo." }, { status: 404 });
  }

  const conversationId = parsed.data.conversationId ?? `web_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  try {
    const result = await withBusiness(businessId, () =>
      handleIncoming({ conversationId, channel: "web", phone: conversationId, text: message }),
    );
    return NextResponse.json({ conversationId, ...result });
  } catch (err) {
    console.error("[velora] chat error", err);
    return NextResponse.json({ error: "No pudimos procesar el mensaje. Inténtalo de nuevo." }, { status: 500 });
  }
}

/** Polls for staff replies when a human has taken over the conversation. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("conversationId") ?? "";
  const businessId = req.nextUrl.searchParams.get("businessId") ?? DEMO_BUSINESS_ID;
  if (!conversationIdSchema.safeParse(id).success || !isValidBusinessId(businessId)) {
    return NextResponse.json({ messages: [] });
  }
  return withBusiness(businessId, async () => {
    const conversation = await getConversation(id);
    if (!conversation) return NextResponse.json({ messages: [] });
    const messages = await listMessages(id, 60);
    return NextResponse.json({
      humanTakeover: conversation.humanTakeover,
      messages: messages.map((m) => ({ id: m.id, role: m.role, text: m.text, createdAt: m.createdAt })),
    });
  });
}
