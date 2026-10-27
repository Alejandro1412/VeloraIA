"use server";

import { getBusiness } from "@/lib/accounts";
import { getAppointment, getSettings, saveAppointment } from "@/lib/data/store";
import { onFeedback } from "@/lib/events";
import { verifyLink } from "@/lib/links";
import { DEMO_BUSINESS_ID, isValidBusinessId, withBusiness } from "@/lib/tenant";

type Ref = { businessId: string; appointmentId: string; token: string };

/** Saves the customer's rating; returns where to send happy customers. */
export async function rateVisit(ref: Ref, rating: number, comment: string): Promise<{ ok?: boolean; error?: string; reviewUrl?: string | null }> {
  if (!isValidBusinessId(ref.businessId) || !verifyLink("opinion", ref.businessId, ref.appointmentId, ref.token)) return { error: "Este enlace no es válido." };
  if (ref.businessId !== DEMO_BUSINESS_ID && !(await getBusiness(ref.businessId))) return { error: "Este enlace no es válido." };
  const stars = Math.round(Number(rating));
  if (!(stars >= 1 && stars <= 5)) return { error: "Elige de 1 a 5 estrellas." };
  return withBusiness(ref.businessId, async () => {
    const apt = await getAppointment(ref.appointmentId);
    if (!apt) return { error: "No encontramos esta cita." };
    const text = comment.trim().slice(0, 1000);
    const first = !apt.rating;
    await saveAppointment({ ...apt, rating: stars, feedback: text || apt.feedback, ratedAt: new Date().toISOString() });
    // Alert once per rating, and again only when a comment is added later.
    if (first || text) await onFeedback(apt, stars, text);
    const settings = await getSettings();
    return { ok: true, reviewUrl: stars >= 4 ? settings.googleReviewUrl || null : null };
  });
}
