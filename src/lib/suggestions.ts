import type { Service } from "./domain/types";

/** Example messages for the chat, built from the business' own services. */
export function chatSuggestions(services: Pick<Service, "name" | "active">[]): string[] {
  const active = services.filter((s) => s.active);
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const out: string[] = [];
  if (active[0]) out.push(`Quiero ${lower(active[0].name)} mañana a las 10`);
  if (active[1]) out.push(`¿Cuánto cuesta ${lower(active[1].name)}?`);
  out.push("¿Cuál es el horario?", "¿Dónde quedan?");
  return out;
}
