"use server";

import { revalidatePath } from "next/cache";
import { getBusiness, updateBusiness } from "@/lib/accounts";
import { requireAdmin } from "@/lib/admin";
import { activatePaidMonth, PLANS, subscriptionFor, type PlanId } from "@/lib/billing";

type Result = { ok?: boolean; error?: string; message?: string };

export async function extendTrialAction(businessId: string, days: number): Promise<Result> {
  await requireAdmin();
  const b = await getBusiness(businessId);
  if (!b) return { error: "Negocio no encontrado" };
  const n = Math.max(1, Math.min(90, Math.round(days)));
  const sub = subscriptionFor(b);
  const base = Math.max(Date.now(), new Date(sub.activeUntil).getTime());
  await updateBusiness(businessId, { trialEndsAt: new Date(base + n * 86_400_000).toISOString() });
  revalidatePath("/admin");
  return { ok: true, message: `Prueba extendida ${n} días` };
}

/** Records a manual payment (transfer, cash): one more month of the plan. */
export async function activatePlanAction(businessId: string, plan: PlanId): Promise<Result> {
  await requireAdmin();
  if (!(plan in PLANS)) return { error: "Plan inválido" };
  await activatePaidMonth(businessId, plan);
  revalidatePath("/admin");
  return { ok: true, message: `Plan ${PLANS[plan].name} activo un mes más` };
}

export async function pauseAction(businessId: string): Promise<Result> {
  await requireAdmin();
  const past = new Date(Date.now() - 30 * 86_400_000).toISOString();
  await updateBusiness(businessId, { trialEndsAt: past, paidUntil: past });
  revalidatePath("/admin");
  return { ok: true, message: "Negocio pausado" };
}
