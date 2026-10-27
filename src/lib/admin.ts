import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "./auth";
import { listBusinesses, listUsers, type Business } from "./accounts";
import { PLANS, startOfMonthUtc, subscriptionFor } from "./billing";
import { listAppointments, listConversations, getSettings } from "./data/store";
import { withBusiness } from "./tenant";

/** IONEX staff who can open /admin. Comma-separated emails in IONEX_ADMIN_EMAILS. */
export function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const list = (process.env.IONEX_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.demo || !isAdminEmail(session.email)) redirect("/app");
  return session;
}

export interface AdminRow {
  id: string;
  name: string;
  vertical: string;
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
  team: number;
  status: "trial" | "active" | "grace" | "paused";
  plan: string;
  daysLeft: number;
  activeUntil: string;
  mrr: number;
  appointments30: number;
  conversationsMonth: number;
  lastLogin: string | null;
  inactiveDays: number | null;
  whatsapp: boolean;
}

const DAY = 86_400_000;

/** One row per business with billing status, usage and engagement. */
export async function adminOverview(now = new Date()) {
  const [businesses, users] = await Promise.all([listBusinesses(), listUsers()]);
  const since30 = new Date(now.getTime() - 30 * DAY).toISOString();
  const monthStart = startOfMonthUtc(now);

  const rows: AdminRow[] = await Promise.all(
    businesses.map(async (b: Business) => {
      const team = users.filter((u) => u.businessId === b.id || u.memberships?.some((m) => m.businessId === b.id));
      const owner = users.find((u) => u.id === b.ownerId) ?? team[0];
      const sub = subscriptionFor(b, now);
      const { appointments, conversations, settings } = await withBusiness(b.id, async () => ({
        appointments: await listAppointments({ from: since30 }),
        conversations: await listConversations(2000),
        settings: await getSettings(),
      }));
      const lastLogin = team.map((u) => u.lastLoginAt).sort().at(-1) ?? null;
      const status: AdminRow["status"] = sub.trial
        ? sub.daysLeft >= 0
          ? "trial"
          : sub.serving
            ? "grace"
            : "paused"
        : sub.daysLeft >= 0
          ? "active"
          : sub.serving
            ? "grace"
            : "paused";
      return {
        id: b.id,
        name: b.name,
        vertical: settings.vertical,
        ownerEmail: owner?.email ?? b.ownerId,
        ownerName: owner?.name ?? "",
        createdAt: b.createdAt,
        team: team.length,
        status,
        plan: sub.trial ? "Prueba" : PLANS[sub.plan].name,
        daysLeft: sub.daysLeft,
        activeUntil: sub.activeUntil,
        mrr: !sub.trial && (status === "active" || status === "grace") ? PLANS[sub.plan].price : 0,
        appointments30: appointments.filter((a) => a.createdAt >= since30).length,
        conversationsMonth: conversations.filter((c) => c.createdAt >= monthStart).length,
        lastLogin,
        inactiveDays: lastLogin ? Math.floor((now.getTime() - new Date(lastLogin).getTime()) / DAY) : null,
        whatsapp: !!settings.whatsappPhoneNumberId,
      };
    }),
  );

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    rows,
    totals: {
      businesses: rows.length,
      paying: rows.filter((r) => r.mrr > 0).length,
      trials: rows.filter((r) => r.status === "trial").length,
      mrr: rows.reduce((s, r) => s + r.mrr, 0),
      expiringSoon: rows.filter((r) => (r.status === "trial" || r.status === "active") && r.daysLeft <= 7).length,
      atRisk: rows.filter((r) => (r.inactiveDays ?? 99) >= 7 && r.status !== "paused").length,
      newThisMonth: rows.filter((r) => r.createdAt >= monthStart).length,
      appointments30: rows.reduce((s, r) => s + r.appointments30, 0),
    },
  };
}
