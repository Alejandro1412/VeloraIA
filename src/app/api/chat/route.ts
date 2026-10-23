import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleIncoming } from "@/lib/agent";
import { getConversation, listMessages } from "@/lib/data/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  conversationId: z
    .string()
    .regex(/^web_[a-z0-9]{8,40}$/i)
    .optional(),
  message: z.string().trim().min(1).max(600),
});

/** Public web chat endpoint used by the landing demo and the embeddable widget. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`chat:${clientIp(req.headers)}`, 25)) {
    return NextResponse.json({ error: "Demasiados mensajes. Espera un minuto e inténtalo de nuevo." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Escribe un mensaje de hasta 600 caracteres." }, { status: 400 });
  }

  const conversationId = parsed.data.conversationId ?? `web_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  try {
    const result = await handleIncoming({
      conversationId,
      channel: "web",
      phone: conversationId,
      text: parsed.data.message,
    });
    return NextResponse.json({ conversationId, ...result });
  } catch (err) {
    console.error("[velora] chat error", err);
    return NextResponse.json({ error: "No pudimos procesar el mensaje. Inténtalo de nuevo." }, { status: 500 });
  }
}

/** Poll for staff replies when a human has taken over the conversation. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("conversationId") ?? "";
  if (!/^web_[a-z0-9]{8,40}$/i.test(id)) return NextResponse.json({ messages: [] });
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ messages: [] });
  const messages = await listMessages(id, 60);
  return NextResponse.json({
    humanTakeover: conversation.humanTakeover,
    messages: messages.map((m) => ({ id: m.id, role: m.role, text: m.text, createdAt: m.createdAt })),
  });
}
