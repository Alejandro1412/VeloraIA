import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { authSecret } from "./secret";
import { siteUrl } from "./site";

/**
 * Signed, login-free links for customers: manage an appointment (confirm,
 * move, cancel) and rate the visit. The signature binds kind + business +
 * appointment, so a link can't be reused for another appointment.
 */
type Kind = "cita" | "opinion";

function sign(kind: Kind, businessId: string, appointmentId: string) {
  return createHmac("sha256", Buffer.from(authSecret()))
    .update(`${kind}:${businessId}:${appointmentId}`)
    .digest("base64url")
    .slice(0, 24);
}

export function verifyLink(kind: Kind, businessId: string, appointmentId: string, token: string) {
  const expected = Buffer.from(sign(kind, businessId, appointmentId));
  const got = Buffer.from(token);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export const appointmentLink = (businessId: string, appointmentId: string) =>
  `${siteUrl()}/cita/${businessId}/${appointmentId}/${sign("cita", businessId, appointmentId)}`;

export const surveyLink = (businessId: string, appointmentId: string) =>
  `${siteUrl()}/opinion/${businessId}/${appointmentId}/${sign("opinion", businessId, appointmentId)}`;
