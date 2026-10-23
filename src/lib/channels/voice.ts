import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Twilio Programmable Voice helpers (speech-to-text via <Gather>). */

export const voiceConfigured = () => !!process.env.TWILIO_AUTH_TOKEN;

const VOICE = process.env.VOICE_NAME || "Polly.Mia";
const LANG = process.env.VOICE_LANGUAGE || "es-MX";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Turns a chat-formatted reply into something pleasant to hear. */
export function toSpeech(text: string): string {
  return text
    .replace(/\*/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\p{Extended_Pictographic}️]/gu, "")
    .replace(/^\s*(\d+)\.\s/gm, "Opción $1: ")
    .replace(/•/g, "")
    .replace(/\(sí \/ no\)/g, "Diga sí o no.")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

export function gatherTwiml(say: string, actionUrl: string, hangup = false) {
  const sayXml = `<Say voice="${VOICE}" language="${LANG}">${escapeXml(toSpeech(say))}</Say>`;
  if (hangup) return `<?xml version="1.0" encoding="UTF-8"?><Response>${sayXml}<Hangup/></Response>`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech dtmf" language="${LANG}" speechTimeout="auto" action="${escapeXml(actionUrl)}" method="POST">${sayXml}</Gather><Say voice="${VOICE}" language="${LANG}">¿Sigues ahí? Si necesitas algo más, vuelve a llamarnos. ¡Hasta pronto!</Say></Response>`;
}

/** Validates X-Twilio-Signature (HMAC-SHA1 of URL + sorted POST params). */
export function verifyTwilio(url: string, params: Record<string, string>, signature: string | null) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  if (!signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const expected = Buffer.from(createHmac("sha1", token).update(data).digest("base64"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
