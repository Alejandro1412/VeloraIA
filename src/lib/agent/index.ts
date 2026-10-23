import "server-only";
import { respond, type AgentDeps } from "../domain/receptionist";
import type { Channel } from "../domain/types";
import { localParts } from "../domain/time";
import {
  addMessage,
  findCustomerByPhone,
  getOrCreateConversation,
  getSettings,
  listMessages,
  listServices,
  saveConversation,
  upcomingForCustomer,
} from "../data/store";
import {
  bookAppointment,
  cancelAppointment,
  confirmAppointment,
  getAvailability,
  rescheduleAppointment,
} from "../booking";
import { llmEnabled, respondWithLlm } from "./llm";

export interface IncomingMessage {
  conversationId: string;
  channel: Channel;
  phone: string;
  profileName?: string;
  text: string;
}

export interface AgentReply {
  reply: string | null;
  event?: string;
  engine: "llm" | "rules" | "human";
}

/**
 * Single entry point for every channel (web, WhatsApp, voice).
 * Persists the transcript, honours human takeover and picks the engine.
 */
export async function handleIncoming(msg: IncomingMessage): Promise<AgentReply> {
  const conversation = await getOrCreateConversation({
    id: msg.conversationId,
    channel: msg.channel,
    phone: msg.phone,
    name: msg.profileName,
  });

  await addMessage(conversation.id, "customer", msg.text);
  conversation.lastMessage = msg.text;
  conversation.updatedAt = new Date().toISOString();
  conversation.unread += 1;

  if (conversation.humanTakeover) {
    await saveConversation(conversation);
    return { reply: null, engine: "human" };
  }

  const [settings, services, customer] = await Promise.all([
    getSettings(),
    listServices({ activeOnly: true }),
    findCustomerByPhone(msg.phone),
  ]);
  const customerName = customer?.name || conversation.customerName || undefined;

  const deps: AgentDeps = {
    now: new Date(),
    settings,
    services,
    customerName,
    slots: (serviceId, date, exclude) => getAvailability(serviceId, date, exclude),
    book: ({ serviceId, start, name }) =>
      bookAppointment({ serviceId, start, name: name || customerName || "Cliente", phone: msg.phone, source: msg.channel }),
    reschedule: rescheduleAppointment,
    cancel: cancelAppointment,
    confirm: confirmAppointment,
    upcoming: async () => {
      // Re-read: the customer may have been created earlier in this same turn.
      const c = customer ?? (await findCustomerByPhone(msg.phone));
      return c ? upcomingForCustomer(c.id) : [];
    },
  };

  let reply: string;
  let engine: AgentReply["engine"] = "rules";
  let event: string | undefined;
  let handoff = false;
  let learnedName: string | undefined;

  if (llmEnabled()) {
    try {
      const history = await listMessages(conversation.id, 40);
      const r = await respondWithLlm(history, deps);
      if (!r.reply) throw new Error("Respuesta vacía del modelo");
      ({ reply, event, customerName: learnedName } = r);
      handoff = !!r.handoff;
      engine = "llm";
      conversation.state = { step: "idle", intent: null };
    } catch (err) {
      console.error("[velora] LLM failed, falling back to rules:", err);
    }
  }

  if (engine === "rules") {
    const r = await respond(msg.text, conversation.state, deps);
    reply = r.reply;
    event = r.event;
    handoff = !!r.handoff;
    learnedName = r.customerName;
    conversation.state = r.state;
  }

  if (learnedName) conversation.customerName = learnedName;
  if (handoff) conversation.humanTakeover = true;
  await addMessage(conversation.id, "assistant", reply!);
  conversation.lastMessage = reply!;
  conversation.updatedAt = new Date().toISOString();
  await saveConversation(conversation);

  return { reply: reply!, event, engine };
}

export function todayLocal(offset: number) {
  return localParts(new Date(), offset).date;
}
