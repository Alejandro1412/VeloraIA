import "server-only";
import { addDays, formatTimeEs, localParts, localToUtc, MONTHS_ES, toMinutes, weekdayOf } from "./domain/time";
import type { Appointment } from "./domain/types";
import { getRepo } from "./data/repo";
import { getSettings, listAppointments, listConversations, listServices, listStaff } from "./data/store";
import { emailConfigured, emailLayout, sendEmail } from "./email";
import { siteUrl } from "./site";
import { currentBusinessId } from "./tenant";

/** "2026-10" → first and last local day. */
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { first, next, label: `${MONTHS_ES[m - 1]} de ${y}` };
}

export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const ACTIVE = new Set(["booked", "confirmed", "completed", "no_show"]);

export interface MonthReport {
  month: string;
  label: string;
  total: number;
  automated: number;
  afterHours: number;
  completed: number;
  noShows: number;
  cancelled: number;
  confirmedRate: number;
  noShowRate: number;
  revenue: number;
  automatedRevenue: number;
  newCustomers: number;
  conversations: number;
  rating: { average: number; count: number };
  byWeek: { label: string; count: number }[];
  byService: { name: string; count: number; revenue: number }[];
  byStaff: { name: string; color: string; count: number }[];
  busiestHour: string | null;
  previous: { total: number; revenue: number; noShowRate: number } | null;
}

/** Everything the owner wants to know about one month, computed from the agenda. */
export async function monthReport(month: string, withPrevious = true): Promise<MonthReport> {
  const settings = await getSettings();
  const { first, next, label } = monthBounds(month);
  const off = settings.utcOffsetMinutes;
  const from = localToUtc(first, "00:00", off).toISOString();
  const to = localToUtc(next, "00:00", off).toISOString();
  const [all, services, staff, conversations] = await Promise.all([listAppointments({ to }), listServices(), listStaff(), listConversations(5000)]);
  const svc = new Map(services.map((s) => [s.id, s]));
  const inMonth = all.filter((a) => a.start >= from && a.start < to);
  const live = inMonth.filter((a) => ACTIVE.has(a.status));
  // Real charge when the front desk registered it; otherwise the list price.
  const price = (a: Appointment) => a.payment?.amount ?? svc.get(a.serviceId)?.price ?? 0;

  // Booked outside business hours (or on a closed day): appointments a human would have missed.
  const afterHours = live.filter((a) => {
    if (a.source === "manual") return false;
    const p = localParts(a.createdAt, off);
    const h = settings.hours[weekdayOf(p.date)];
    if (!h) return true;
    const m = toMinutes(p.time);
    return m < toMinutes(h.open) || m >= toMinutes(h.close);
  }).length;

  const firstSeen = new Map<string, string>();
  for (const a of [...all].sort((x, y) => x.start.localeCompare(y.start))) if (!firstSeen.has(a.customerId)) firstSeen.set(a.customerId, a.start);
  const newCustomers = [...firstSeen.values()].filter((s) => s >= from && s < to).length;

  const completed = inMonth.filter((a) => a.status === "completed");
  const noShows = inMonth.filter((a) => a.status === "no_show").length;
  const attendedOrMissed = completed.length + noShows;
  const reminded = live.filter((a) => a.reminderSentAt);
  const confirmedAfterReminder = reminded.filter((a) => a.status !== "no_show" && a.status !== "booked").length;
  const rated = inMonth.filter((a) => typeof a.rating === "number");

  // Weeks of the month (1–7, 8–14, …).
  const byWeek: { label: string; count: number }[] = [];
  for (let w = 0; addDays(first, w * 7) < next; w++) {
    const startDay = addDays(first, w * 7);
    const endDay = addDays(first, w * 7 + 7) < next ? addDays(first, w * 7 + 7) : next;
    const count = live.filter((a) => {
      const d = localParts(a.start, off).date;
      return d >= startDay && d < endDay;
    }).length;
    byWeek.push({ label: `${Number(startDay.slice(8))}–${Number(addDays(endDay, -1).slice(8))}`, count });
  }

  const serviceAgg = new Map<string, { name: string; count: number; revenue: number }>();
  for (const a of live) {
    const s = svc.get(a.serviceId);
    const row = serviceAgg.get(a.serviceId) ?? { name: s?.name ?? "Servicio eliminado", count: 0, revenue: 0 };
    row.count++;
    if (a.status === "completed") row.revenue += price(a);
    serviceAgg.set(a.serviceId, row);
  }

  const hours = new Map<string, number>();
  for (const a of live) {
    const t = localParts(a.start, off).time.slice(0, 2);
    hours.set(t, (hours.get(t) ?? 0) + 1);
  }
  const busiest = [...hours.entries()].sort((x, y) => y[1] - x[1])[0];

  const prev = withPrevious ? await monthReport(shiftMonth(month, -1), false) : null;

  return {
    month,
    label,
    total: live.length,
    automated: live.filter((a) => a.source !== "manual").length,
    afterHours,
    completed: completed.length,
    noShows,
    cancelled: inMonth.filter((a) => a.status === "cancelled").length,
    confirmedRate: reminded.length ? confirmedAfterReminder / reminded.length : 0,
    noShowRate: attendedOrMissed ? noShows / attendedOrMissed : 0,
    revenue: completed.reduce((s, a) => s + price(a), 0),
    automatedRevenue: completed.filter((a) => a.source !== "manual").reduce((s, a) => s + price(a), 0),
    newCustomers,
    conversations: conversations.filter((c) => c.createdAt >= from && c.createdAt < to).length,
    rating: { average: rated.length ? rated.reduce((s, a) => s + (a.rating ?? 0), 0) / rated.length : 0, count: rated.length },
    byWeek,
    byService: [...serviceAgg.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    byStaff: staff
      .map((s) => ({ name: s.name, color: s.color, count: live.filter((a) => a.staffId === s.id).length }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count),
    busiestHour: busiest ? formatTimeEs(`${busiest[0]}:00`) : null,
    previous: prev ? { total: prev.total, revenue: prev.revenue, noShowRate: prev.noShowRate } : null,
  };
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/**
 * On the 1st of each month (business time), email last month's report to the
 * owner. Idempotent through a per-business marker.
 */
export async function sendMonthlyReport(now = new Date()) {
  const settings = await getSettings();
  const local = localParts(now, settings.utcOffsetMinutes).date;
  if (!local.endsWith("-01") || !settings.notifyEmail || !emailConfigured()) return { sent: false };
  const month = shiftMonth(local.slice(0, 7), -1);
  const businessId = await currentBusinessId();
  const repo = getRepo();
  const marker = `${businessId}:${month}`;
  if (await repo.get("report_sent", marker)) return { sent: false };

  const r = await monthReport(month);
  const url = `${siteUrl()}/app/informe?mes=${month}`;
  const lines = [
    `${settings.assistantName} gestionó ${r.total} citas en ${r.label}; ${r.automated} sin que tu equipo interviniera.`,
    `${r.afterHours} llegaron fuera de tu horario: citas que antes se habrían perdido.`,
    `Ingresos de citas atendidas: ${money(r.revenue)} (${money(r.automatedRevenue)} de citas que agendó ${settings.assistantName}).`,
    `Inasistencia: ${Math.round(r.noShowRate * 100)}% · Clientes nuevos: ${r.newCustomers}${r.rating.count ? ` · Calificación: ${r.rating.average.toFixed(1)} ★` : ""}.`,
  ];
  const ok = await sendEmail({
    to: settings.notifyEmail,
    subject: `Tu informe de ${r.label} · ${settings.name}`,
    text: `${lines.join("\n")}\n\n${url}`,
    html: emailLayout({ title: `Así le fue a ${settings.name} en ${r.label}`, paragraphs: lines, cta: { label: "Ver el informe completo", url } }),
  });
  if (ok) await repo.put("report_sent", marker, { at: now.toISOString() });
  return { sent: ok };
}
