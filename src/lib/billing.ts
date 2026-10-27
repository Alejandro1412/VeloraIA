import "server-only";
import { getRepo } from "./data/repo";
import type { Business } from "./accounts";
import { DEMO_BUSINESS_ID } from "./tenant";

/** Plans, free trial and what each plan unlocks. Prices in COP per month. */

export type PlanId = "esencial" | "profesional" | "sedes";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  conversationsPerMonth: number;
  ai: boolean;
  voice: boolean;
  staffLimit: number;
}

export const PLANS: Record<PlanId, Plan> = {
  esencial: { id: "esencial", name: "Esencial", price: 249000, conversationsPerMonth: 400, ai: false, voice: false, staffLimit: 3 },
  profesional: { id: "profesional", name: "Profesional", price: 449000, conversationsPerMonth: 1500, ai: true, voice: true, staffLimit: 10 },
  sedes: { id: "sedes", name: "Sedes", price: 690000, conversationsPerMonth: Infinity, ai: true, voice: true, staffLimit: 50 },
};

export const TRIAL_DAYS = 14;
export const GRACE_DAYS = 5;
const DAY = 86_400_000;

export interface Subscription {
  /** Plan being paid for (or the plan whose features the trial unlocks). */
  plan: PlanId;
  trial: boolean;
  /** End of the trial or of the last paid month. */
  activeUntil: string;
  /** Whether the agenda still serves customers (active or within grace). */
  serving: boolean;
  /** Days left until `activeUntil` (negative when overdue). */
  daysLeft: number;
  limits: Plan;
}

export function subscriptionFor(business: Pick<Business, "id" | "createdAt"> & Partial<Business>, now = new Date()): Subscription {
  if (business.id === DEMO_BUSINESS_ID) {
    return { plan: "profesional", trial: false, activeUntil: "2099-01-01T00:00:00.000Z", serving: true, daysLeft: 9999, limits: PLANS.profesional };
  }
  const trialEnds = business.trialEndsAt ?? new Date(new Date(business.createdAt).getTime() + TRIAL_DAYS * DAY).toISOString();
  const paid = business.paidUntil && business.paidUntil > trialEnds ? business.paidUntil : null;
  const activeUntil = paid ?? trialEnds;
  const plan = (paid ? business.plan : "profesional") ?? "profesional";
  const daysLeft = Math.ceil((new Date(activeUntil).getTime() - now.getTime()) / DAY);
  return {
    plan: plan as PlanId,
    trial: !paid,
    activeUntil,
    serving: daysLeft > -GRACE_DAYS,
    daysLeft,
    limits: PLANS[(plan as PlanId) in PLANS ? (plan as PlanId) : "profesional"],
  };
}

/** Extends the subscription one month from the later of now or the current end date. */
export async function activatePaidMonth(businessId: string, plan: PlanId, now = new Date()) {
  const repo = getRepo();
  const business = await repo.get<Business>("business", businessId);
  if (!business) throw new Error(`Unknown business ${businessId}`);
  const current = subscriptionFor(business, now);
  const base = Math.max(now.getTime(), new Date(current.activeUntil).getTime());
  const next = new Date(base);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const updated: Business = { ...business, plan, paidUntil: next.toISOString() };
  await repo.put("business", businessId, updated, { ts: business.createdAt });
  return updated;
}

export const startOfMonthUtc = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
