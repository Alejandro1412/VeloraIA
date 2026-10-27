import "server-only";
import { respond, type AgentDeps } from "../domain/receptionist";
import { getBusiness } from "../accounts";
import { startOfMonthUtc, subscriptionFor } from "../billing";
import { onHandoff } from "../events";
import { siteUrl } from "../site";
import { currentBusinessId } from "../tenant";
import type { Channel } from "../domain/types";
import { localParts } from "../domain/time";
import {
  addMessage,
  findCustomerByPhone,
  getOrCreateConversation,
  addToWaitlist,
  countConversationsSince,
  getSettings,
  listMessages,
  listServices,
  listStaff,
  saveConversation,
  upcomingForCustomer,
  upsertCustomer,
} from "../data/store";
import {
  bookAppointment,
  cancelAppointment,
  confirmAppointment,
  getAvailability,
  rescheduleAppointment,
} from "../booking";
import { llmEnabled, respondWithLlm } from "./llm";
import { appointmentLink } from "../links";

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
  const businessId = await currentBusinessId();
  const business = businessId === "demo" ? { id: "demo", createdAt: new Date().toISOString() } : await getBusiness(businessId);
  const subscription = business ? subscriptionFor(business) : null;

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

  const [settings, services, customer, staff] = await Promise.all([
    getSettings(),
    listServices({ activeOnly: true }),
    findCustomerByPhone(msg.phone),
    listStaff({ activeOnly: true }),
  ]);
  const customerName = customer?.name || conversation.customerName || undefined;

  // Plan enforcement: unpaid accounts (after the grace period) or accounts over
  // their monthly conversation quota stop booking online, politely.
  const overQuota =
    subscription &&
    Number.isFinite(subscription.limits.conversationsPerMonth) &&
    conversation.createdAt >= startOfMonthUtc() &&
    (await countConversationsSince(startOfMonthUtc())) > subscription.limits.conversationsPerMonth;
  if (!subscription?.serving || overQuota) {
    const contact = settings.phone ? ` al ${settings.phone}` : "";
    const reply = `Hola 👋 En este momento no puedo agendar en línea. Comunícate con ${settings.name}${contact} y con gusto te atienden.`;
    await addMessage(conversation.id, "assistant", reply);
    await saveConversation({ ...conversation, lastMessage: reply, updatedAt: new Date().toISOString() });
    return { reply, engine: "rules" };
  }

  const deps: AgentDeps = {
    now: new Date(),
    settings,
    services,
    customerName,
    staff,
    slots: (serviceId, date, exclude, staffId) => getAvailability(serviceId, date, { excludeAppointmentId: exclude, staffId }),
    book: ({ serviceId, start, name, staffId }) =>
      bookAppointment({ serviceId, start, name: name || customerName || "Cliente", phone: msg.phone, source: msg.channel, staffId }),
    manageLink: (apt) => appointmentLink(businessId, apt.id),
    paymentLink: (apt) => (apt.deposit?.status === "pending" ? `${siteUrl()}/pagar/${businessId}/${apt.id}` : null),
    joinWaitlist: async ({ serviceId, date, name }) => {
      await upsertCustomer(msg.phone, name);
      await addToWaitlist({ customerPhone: msg.phone, customerName: name, serviceId, date, conversationId: conversation.id });
    },
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

  if (llmEnabled() && subscription.limits.ai) {
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
  const handedOffNow = handoff;
  const lastCustomerMessage = msg.text;
  conversation.lastMessage = reply!;
  conversation.updatedAt = new Date().toISOString();
  await saveConversation(conversation);
  if (handedOffNow) await onHandoff({ ...conversation, lastMessage: lastCustomerMessage });

  return { reply: reply!, event, engine };
}

export function todayLocal(offset: number) {
  return localParts(new Date(), offset).date;
}
