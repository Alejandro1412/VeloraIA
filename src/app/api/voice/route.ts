import { NextResponse, type NextRequest } from "next/server";
import { handleIncoming } from "@/lib/agent";
import { gatherTwiml, verifyTwilio } from "@/lib/channels/voice";
import { getSettings } from "@/lib/data/store";
import { DEMO_BUSINESS_ID, isValidBusinessId, withBusiness } from "@/lib/tenant";

/**
 * Twilio voice webhook. Point each business' Twilio number "A call comes in"
 * URL to https://<your-domain>/api/voice?b=<businessId> (HTTP POST).
 */
export async function POST(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("b") ?? DEMO_BUSINESS_ID;
  if (!isValidBusinessId(businessId)) return new NextResponse("Not found", { status: 404 });
  return withBusiness(businessId, () => answer(req));
}

async function answer(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const url = `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (!verifyTwilio(url, params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const xml = (body: string) => new NextResponse(body, { headers: { "content-type": "text/xml; charset=utf-8" } });
  const speech = (params.SpeechResult || params.Digits || "").trim();

  if (!speech) {
    const settings = await getSettings();
    return xml(gatherTwiml(`Hola, gracias por llamar a ${settings.name}. Soy ${settings.assistantName}, la asistente virtual. ¿En qué te puedo ayudar?`, url));
  }

  const result = await handleIncoming({
    conversationId: `voice_${params.CallSid}`,
    channel: "voice",
    phone: params.From || `voice_${params.CallSid}`,
    text: speech,
  });

  if (!result.reply) return xml(gatherTwiml("Te comunico con el equipo. Un momento por favor.", url, true));
  const done = result.event === "booked" || result.event === "cancelled" || result.event === "rescheduled";
  return xml(gatherTwiml(done ? `${result.reply} ¿Necesitas algo más?` : result.reply, url));
}
