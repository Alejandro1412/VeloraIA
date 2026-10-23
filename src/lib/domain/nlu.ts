/**
 * Lightweight Spanish language understanding for the offline receptionist.
 * Deterministic, dependency-free and fast enough to run on every message.
 */
import type { Service } from "./types";
import { addDays, MONTHS_ES, WEEKDAYS_ES, weekdayOf } from "./time";

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿¡!?,;()"]/g, " ")
    .replace(/(\d)\.(\d{2})\b/g, "$1:$2") // "3.30" → "3:30"
    .replace(/\.(\s|$)/g, " ")
    .replace(/:(\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const has = (t: string, words: RegExp) => words.test(t);

export type Intent =
  | "greeting"
  | "book"
  | "cancel"
  | "reschedule"
  | "services"
  | "hours"
  | "location"
  | "human"
  | "thanks"
  | "confirm_attendance"
  | "my_appointments"
  | "yes"
  | "no"
  | "unknown";

export function detectIntents(raw: string): Set<Intent> {
  const t = normalize(raw);
  const out = new Set<Intent>();
  if (has(t, /\b(hola|buen(os|as)? (dias|tardes|noches)|buenas|hey|saludos|que tal)\b/)) out.add("greeting");
  if (has(t, /\b(cancel\w*|anular|ya no (puedo|voy)|no (podre|puedo) ir|eliminar (la|mi) cita)\b/)) out.add("cancel");
  if (has(t, /\b(reprogram\w*|cambiar (la|mi|de) (cita|hora|fecha|dia)|mover (la|mi) cita|correr (la|mi) cita|otro dia|otra hora|aplazar)\b/)) out.add("reschedule");
  if (has(t, /\b(agend\w*|cita|reserv\w*|apart\w*|turno|separar|quiero (ir|una)|necesito (una|ir)|disponib\w*|cupo|espacio)\b/)) out.add("book");
  if (has(t, /\b(servicio|servicios|precio|precios|cuanto (cuesta|vale|sale)|valor|tarifa|que (hacen|ofrecen)|costo)\b/)) out.add("services");
  if (has(t, /\b(horario|horarios|a que hora (abren|cierran)|atienden|abren|cierran|abierto)\b/)) out.add("hours");
  if (has(t, /\b(direccion|donde (quedan|estan|es)|ubicacion|como llego|ubicados|parqueadero)\b/)) out.add("location");
  if (has(t, /\b(humano|persona|asesor|alguien|hablar con|llamar|operador|recepcionista real)\b/)) out.add("human");
  if (has(t, /\b(gracias|muchas gracias|mil gracias|listo gracias|perfecto gracias)\b/)) out.add("thanks");
  if (has(t, /^(confirmo|confirmado|si confirmo|confirmar|ahi estare|alli estare|si asistire|asistire)\b/)) out.add("confirm_attendance");
  if (has(t, /\b(mis citas|mi cita|tengo (una )?cita|cuando es mi cita|a que hora es mi cita)\b/)) out.add("my_appointments");
  if (has(t, /^(si|sí|claro|dale|listo|ok|okay|de una|perfecto|correcto|confirmo|exacto|vale|hagale|por favor|si senor|si señora)\b/)) out.add("yes");
  if (has(t, /^(no|nop|nel|negativo|mejor no|todavia no|aun no)\b/)) out.add("no");
  if (out.size === 0) out.add("unknown");
  return out;
}

/** Parses a local date mentioned in free text. Returns YYYY-MM-DD or null. */
export function parseDate(raw: string, today: string): string | null {
  const t = normalize(raw);
  if (/\bpasado manana\b/.test(t)) return addDays(today, 2);
  if (/\bmanana\b/.test(t) && !/\b(en la|por la|de la) manana\b/.test(t)) return addDays(today, 1);
  if (/\b(hoy|ahorita|esta (tarde|noche))\b/.test(t)) return today;

  // 25/10, 25-10, 25/10/2026
  const numeric = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const d = Number(numeric[1]);
    const m = Number(numeric[2]);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return resolveDayMonth(d, m, today, numeric[3]);
  }

  // "25 de octubre", "el 3 de noviembre"
  const named = t.match(/\b(\d{1,2}) de ([a-z]+)/);
  if (named) {
    const m = MONTHS_ES.indexOf(named[2]) + 1;
    if (m > 0) return resolveDayMonth(Number(named[1]), m, today);
  }

  // weekday names: "el lunes", "proximo viernes"
  const weekdays = WEEKDAYS_ES.map((w) => normalize(w));
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${weekdays[i]}\\b`).test(t)) {
      const current = weekdayOf(today);
      let diff = (i - current + 7) % 7;
      if (diff === 0) diff = /\b(hoy|este)\b/.test(t) ? 0 : 7;
      if (/\b(proximo|siguiente|que viene)\b/.test(t) && diff < 7 && diff !== 0 && /semana/.test(t)) diff += 7;
      return addDays(today, diff);
    }
  }

  // "el 28" (day of current or next month)
  const lone = t.match(/\b(?:el|dia|para el) (\d{1,2})\b(?!\s*(?::|h\b|am|pm|de la|y media))/);
  if (lone) {
    const d = Number(lone[1]);
    if (d >= 1 && d <= 31) {
      const [y, m] = today.split("-").map(Number);
      const candidate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return candidate >= today ? candidate : resolveDayMonth(d, m === 12 ? 1 : m + 1, today);
    }
  }
  return null;
}

function resolveDayMonth(d: number, m: number, today: string, yearRaw?: string): string {
  const [ty] = today.split("-").map(Number);
  let y = yearRaw ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : ty;
  let candidate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (!yearRaw && candidate < today) {
    y += 1;
    candidate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return candidate;
}

/** Parses a local time. Returns "HH:mm" or null. */
export function parseTime(raw: string): string | null {
  const t = normalize(raw);
  if (/\bmediodia\b/.test(t)) return "12:00";

  const m = t.match(
    /\b(?:a las |las |a la |la )?(\d{1,2})(?:[:h](\d{2}))?\s*(?:(y media|y cuarto)\b)?\s*(am|a m|pm|p m|de la manana|de la tarde|de la noche|del mediodia)?\b/,
  );
  // require some time signal to avoid capturing plain numbers like "1" (option picks)
  const signal = /(:\d{2}|\bh\b|am\b|pm\b|a m\b|p m\b|de la (manana|tarde|noche)|a las|las \d|y media|y cuarto)/.test(t);
  if (!m || !signal) return null;

  let h = Number(m[1]);
  let min = m[2] ? Number(m[2]) : 0;
  if (m[3] === "y media") min = 30;
  if (m[3] === "y cuarto") min = 15;
  const suffix = m[4] ?? "";
  if (h > 23 || min > 59) return null;

  if (/pm|p m|tarde|noche/.test(suffix) && h < 12) h += 12;
  else if (/am|a m|manana/.test(suffix) && h === 12) h = 0;
  else if (!suffix && h >= 1 && h <= 6) h += 12; // "a las 3" in a clinic means 3 p.m.

  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "la 2", "opcion 3", "2", "la primera" → 1-based index */
export function parseChoice(raw: string): number | null {
  const t = normalize(raw);
  const ordinals = ["primera", "segunda", "tercera", "cuarta", "quinta", "sexta", "septima", "octava"];
  for (let i = 0; i < ordinals.length; i++) {
    if (new RegExp(`\\b(la |el )?${ordinals[i]}\\b`).test(t) || new RegExp(`\\b${ordinals[i].replace(/a$/, "o")}\\b`).test(t)) return i + 1;
  }
  const m = t.match(/^(?:(?:la|el|opcion|numero|#)\s*)?(\d{1,2})$/);
  return m ? Number(m[1]) : null;
}

/** Best matching service by keywords and name tokens. */
export function matchService(raw: string, services: Service[]): Service | null {
  const t = normalize(raw);
  let best: { s: Service; score: number } | null = null;
  for (const s of services.filter((x) => x.active)) {
    let score = 0;
    const terms = [s.name, ...s.keywords].map(normalize);
    for (const term of terms) {
      if (!term) continue;
      if (t.includes(term)) score += term.length + 5;
      else
        for (const word of term.split(" ").filter((w) => w.length > 3))
          if (new RegExp(`\\b${word.slice(0, Math.max(4, word.length - 2))}`).test(t)) score += 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { s, score };
  }
  return best?.s ?? null;
}

/** Extracts a person's name from replies like "Soy Ana Gómez" / "me llamo Ana". */
export function parseName(raw: string): string | null {
  const cleaned = raw.trim().replace(/[.!¡¿?]+$/g, "");
  const m = cleaned.match(/(?:me llamo|mi nombre es|soy|a nombre de)\s+(.+)/i);
  const candidate = (m ? m[1] : cleaned).trim();
  if (!/^[\p{L}][\p{L}\s'.-]{1,60}$/u.test(candidate)) return null;
  const words = candidate.split(/\s+/);
  if (words.length > 5) return null;
  const blocked = new Set(["si", "no", "hola", "gracias", "listo", "ok", "dale"]);
  if (words.length === 1 && blocked.has(normalize(candidate))) return null;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
