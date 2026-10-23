import "server-only";
import { formatMoney, formatTimeEs, localParts, localToUtc, formatDateEs, WEEKDAYS_ES } from "../domain/time";
import type { AgentDeps } from "../domain/receptionist";
import type { Message } from "../domain/types";

/**
 * LLM receptionist powered by Claude (Anthropic Messages API, tool use).
 * The model never touches the database directly: every action goes through
 * the same validated tool functions the rule-based agent uses.
 */

const MODEL = process.env.AI_MODEL || "claude-haiku-5-5";
const MAX_STEPS = 6;

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

interface ApiMessage {
  role: "user" | "assistant";
  content: string | Block[];
}

const TOOLS = [
  {
    name: "get_available_slots",
    description: "Lista los horarios libres (hora local) para un servicio en una fecha. Úsalo SIEMPRE antes de proponer horas.",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD en hora local del negocio" },
      },
      required: ["service_id", "date"],
    },
  },
  {
    name: "book_appointment",
    description: "Agenda la cita. Solo después de que el cliente confirme servicio, fecha, hora y nombre.",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:mm (24h) exactamente como lo devolvió get_available_slots" },
        customer_name: { type: "string" },
      },
      required: ["service_id", "date", "time", "customer_name"],
    },
  },
  {
    name: "list_my_appointments",
    description: "Citas próximas del cliente que escribe (para consultar, mover o cancelar).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "reschedule_appointment",
    description: "Mueve una cita existente a un nuevo horario libre (validar antes con get_available_slots).",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
      },
      required: ["appointment_id", "date", "time"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancela una cita del cliente. Pide confirmación explícita antes.",
    input_schema: { type: "object", properties: { appointment_id: { type: "string" } }, required: ["appointment_id"] },
  },
  {
    name: "confirm_appointment",
    description: "Marca como confirmada la asistencia del cliente a su cita.",
    input_schema: { type: "object", properties: { appointment_id: { type: "string" } }, required: ["appointment_id"] },
  },
  {
    name: "handoff_to_human",
    description: "Transfiere la conversación al equipo humano (quejas, temas clínicos, pagos, o si el cliente lo pide).",
    input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
  },
];

function systemPrompt(deps: AgentDeps) {
  const s = deps.settings;
  const now = localParts(deps.now, s.utcOffsetMinutes);
  const hours = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => {
      const h = s.hours[d];
      const breaks = h?.breaks.map((b) => `${b.start}-${b.end}`).join(", ");
      return `- ${WEEKDAYS_ES[d]}: ${h ? `${h.open}-${h.close}${breaks ? ` (pausa ${breaks})` : ""}` : "cerrado"}`;
    })
    .join("\n");
  const services = deps.services
    .filter((x) => x.active)
    .map((x) => `- id=${x.id} | ${x.name} | ${x.durationMinutes} min | ${formatMoney(x.price, s.currency)} | ${x.description}`)
    .join("\n");

  return `Eres ${s.assistantName}, la recepcionista virtual de "${s.name}" (${s.vertical}). Atiendes por chat en español colombiano, con calidez, frases cortas y emojis con moderación. Tu trabajo: agendar, reprogramar, cancelar y confirmar citas, y resolver dudas de horarios, precios y ubicación.

Hoy es ${formatDateEs(now.date)} (${now.date}), son las ${formatTimeEs(now.time)} hora local.
Cliente: ${deps.customerName ? deps.customerName : "aún no sabemos su nombre"}.

Servicios:
${services}

Horario:
${hours}

Dirección: ${s.address} (${s.mapsUrl}). Teléfono: ${s.phone}.

Reglas:
1. Nunca inventes horarios: consulta get_available_slots y ofrece máximo 4 opciones numeradas.
2. Antes de book_appointment resume servicio, fecha, hora y nombre y espera un "sí".
3. Si el cliente da una hora sin fecha, asume el día disponible más cercano y dilo.
4. No des diagnósticos ni consejos médicos; ofrece una valoración o transfiere al equipo.
5. Usa *negrita* de WhatsApp para fecha y hora. Respuestas de máximo 5 líneas.
${s.extraInstructions ? `6. ${s.extraInstructions}` : ""}`;
}

function toApiHistory(history: Message[]): ApiMessage[] {
  const out: ApiMessage[] = [];
  for (const m of history) {
    const role = m.role === "customer" ? "user" : "assistant";
    const last = out[out.length - 1];
    if (last && last.role === role && typeof last.content === "string") last.content += `\n${m.text}`;
    else out.push({ role, content: m.text });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export interface LlmResult {
  reply: string;
  handoff?: boolean;
  event?: "booked" | "rescheduled" | "cancelled" | "confirmed";
  customerName?: string;
}

export function llmEnabled() {
  return !!process.env.ANTHROPIC_API_KEY && process.env.AI_MODE !== "rules";
}

export async function respondWithLlm(history: Message[], deps: AgentDeps): Promise<LlmResult> {
  const messages = toApiHistory(history.slice(-24));
  const result: LlmResult = { reply: "" };
  const offset = deps.settings.utcOffsetMinutes;
  const at = (date: string, time: string) => localToUtc(date, time, offset).toISOString();

  const run = async (name: string, input: Record<string, string>): Promise<unknown> => {
    switch (name) {
      case "get_available_slots": {
        const slots = await deps.slots(input.service_id, input.date);
        return slots.length ? { date: input.date, times: slots.map((s) => s.time) } : { date: input.date, times: [], note: "Sin espacios ese día" };
      }
      case "book_appointment": {
        const apt = await deps.book({ serviceId: input.service_id, start: at(input.date, input.time), name: input.customer_name });
        result.event = "booked";
        result.customerName = input.customer_name;
        return { ok: true, appointment_id: apt.id };
      }
      case "list_my_appointments": {
        const items = await deps.upcoming();
        return items.map((a) => ({
          appointment_id: a.id,
          service: deps.services.find((s) => s.id === a.serviceId)?.name,
          ...(() => {
            const p = localParts(a.start, offset);
            return { date: p.date, time: p.time };
          })(),
          status: a.status,
        }));
      }
      case "reschedule_appointment":
        await deps.reschedule(input.appointment_id, at(input.date, input.time));
        result.event = "rescheduled";
        return { ok: true };
      case "cancel_appointment":
        await deps.cancel(input.appointment_id);
        result.event = "cancelled";
        return { ok: true };
      case "confirm_appointment":
        await deps.confirm(input.appointment_id);
        result.event = "confirmed";
        return { ok: true };
      case "handoff_to_human":
        result.handoff = true;
        return { ok: true, note: "Avísale al cliente que una persona del equipo le responderá por este chat." };
      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  };

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: systemPrompt(deps), tools: TOOLS, messages }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: Block[]; stop_reason: string };

    messages.push({ role: "assistant", content: data.content });
    const calls = data.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
    if (data.stop_reason !== "tool_use" || !calls.length) {
      result.reply = data.content
        .filter((b): b is Extract<Block, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return result;
    }

    const results: Block[] = [];
    for (const call of calls) {
      try {
        const output = await run(call.name, call.input as Record<string, string>);
        results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(output) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: (err as Error).message, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("El agente excedió el número máximo de pasos");
}
