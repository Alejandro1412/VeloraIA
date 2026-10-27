import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { BusinessSettings } from "./domain/types";

/**
 * Wompi (Bancolombia) Web Checkout: PSE, Nequi, tarjetas y Bancolombia.
 * - IONEX subscriptions use IONEX's account (env WOMPI_*).
 * - Appointment deposits use each business' own account (stored in its settings).
 */

const CHECKOUT = "https://checkout.wompi.co/p/";

export interface WompiKeys {
  publicKey: string;
  integritySecret: string;
}

export const ionexWompi = (): WompiKeys | null =>
  process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET
    ? { publicKey: process.env.WOMPI_PUBLIC_KEY, integritySecret: process.env.WOMPI_INTEGRITY_SECRET }
    : null;

export const wompiReady = (s: Pick<BusinessSettings, "wompiPublicKey" | "wompiIntegritySecret">) =>
  !!s.wompiPublicKey && !!s.wompiIntegritySecret;

export const businessWompi = (s: BusinessSettings): WompiKeys | null =>
  wompiReady(s) ? { publicKey: s.wompiPublicKey!, integritySecret: s.wompiIntegritySecret! } : null;

const nonce = () => Date.now().toString(36);
export const depositReference = (appointmentId: string) => `dep_${appointmentId}_${nonce()}`;
export const subscriptionReference = (businessId: string, plan: string) => `sub_${businessId}_${plan}_${nonce()}`;

export function parseReference(ref: string) {
  const dep = ref.match(/^dep_(apt_[A-Za-z0-9_]+?)_[a-z0-9]+$/);
  if (dep) return { kind: "deposit" as const, appointmentId: dep[1] };
  const sub = ref.match(/^sub_(biz_[a-f0-9]{16})_([a-z]+)_[a-z0-9]+$/);
  if (sub) return { kind: "subscription" as const, businessId: sub[1], plan: sub[2] };
  return null;
}

/** Signed Web Checkout URL. Amount in COP (pesos), converted to cents. */
export function checkoutUrl(keys: WompiKeys, input: { reference: string; amount: number; redirectUrl: string; email?: string }) {
  const amountInCents = Math.round(input.amount * 100);
  const signature = createHash("sha256")
    .update(`${input.reference}${amountInCents}COP${keys.integritySecret}`)
    .digest("hex");
  const params = new URLSearchParams({
    "public-key": keys.publicKey,
    currency: "COP",
    "amount-in-cents": String(amountInCents),
    reference: input.reference,
    "signature:integrity": signature,
    "redirect-url": input.redirectUrl,
  });
  if (input.email) params.set("customer-data:email", input.email);
  return `${CHECKOUT}?${params.toString()}`;
}

export interface WompiEvent {
  event: string;
  data: { transaction: { id: string; status: string; reference: string; amount_in_cents: number } };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
}

/** Verifies an event's checksum: sha256(values of properties + timestamp + events secret). */
export function verifyEvent(event: WompiEvent, eventsSecret: string): boolean {
  if (!event?.signature?.properties || !event.signature.checksum) return false;
  const values = event.signature.properties
    .map((path) => path.split(".").reduce<unknown>((obj, key) => (obj as Record<string, unknown> | undefined)?.[key], event.data))
    .join("");
  const expected = Buffer.from(createHash("sha256").update(`${values}${event.timestamp}${eventsSecret}`).digest("hex"));
  const received = Buffer.from(String(event.signature.checksum).toLowerCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}
