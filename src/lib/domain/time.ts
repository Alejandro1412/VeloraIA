/**
 * Timezone helpers based on a fixed UTC offset.
 * Colombia (and most of LatAm we target) has no DST, so a fixed offset is
 * exact and avoids shipping a tz database to the edge.
 */

export interface LocalParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  weekday: number; // 0 = Sunday
  minutes: number; // minutes since local midnight
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Local wall-clock parts of a UTC instant. */
export function localParts(instant: Date | string, offsetMinutes: number): LocalParts {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const shifted = new Date(d.getTime() + offsetMinutes * 60_000);
  const date = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return { date, time: fromMinutes(minutes), weekday: shifted.getUTCDay(), minutes };
}

/** UTC instant for a local date + time. */
export function localToUtc(date: string, time: string, offsetMinutes: number): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const mins = toMinutes(time);
  return new Date(Date.UTC(y, mo - 1, d, 0, mins) - offsetMinutes * 60_000);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "martes 28 de octubre" */
export function formatDateEs(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAYS_ES[weekdayOf(date)]} ${d} de ${MONTHS_ES[m - 1]}`;
}

/** "3:30 p. m." */
export function formatTimeEs(hhmm: string): string {
  const mins = toMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h < 12 ? "a. m." : "p. m."}`;
}

/** Relative day label used in chat: "hoy", "mañana" or the full date. */
export function relativeDayEs(date: string, today: string): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return `hoy ${formatDateEs(date).split(" ").slice(1).join(" ")}`;
  if (diff === 1) return `mañana ${formatDateEs(date)}`;
  return formatDateEs(date);
}

export function formatMoney(amount: number, currency = "COP"): string {
  if (amount === 0) return "Sin costo";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
