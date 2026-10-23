import "server-only";
import { getRepo } from "./repo";
import { buildDemoData, DEFAULT_SERVICES, DEFAULT_SETTINGS } from "./seed";
import type {
  Appointment,
  BusinessSettings,
  Channel,
  Conversation,
  Customer,
  Message,
  MessageRole,
  Service,
} from "../domain/types";

/**
 * Data access layer. Every read/write in the app goes through here, so
 * swapping storage or adding multi-tenancy later touches one file.
 */

let seeding: Promise<void> | null = null;

async function ensureSeeded() {
  seeding ??= (async () => {
    const repo = getRepo();
    if (await repo.get<BusinessSettings>("settings", "business")) return;
    await repo.put("settings", "business", DEFAULT_SETTINGS);
    for (const s of DEFAULT_SERVICES) await repo.put("service", s.id, s);
    if (process.env.SEED_DEMO === "false") return;
    const demo = buildDemoData(new Date());
    await Promise.all([
      ...demo.customers.map((c) => repo.put("customer", c.id, c, { ts: c.createdAt })),
      ...demo.appointments.map((a) => repo.put("appointment", a.id, a, { ts: a.start })),
      ...demo.conversations.map((c) => repo.put("conversation", c.id, c, { ts: c.updatedAt })),
      ...demo.messages.map((m) => repo.put("message", m.id, m, { ts: m.createdAt, parent: m.conversationId })),
    ]);
  })().catch((err) => {
    seeding = null;
    throw err;
  });
  return seeding;
}

async function repo() {
  await ensureSeeded();
  return getRepo();
}

export const storageDriver = () => getRepo().driver;

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;

/* -------------------------------- settings -------------------------------- */

export async function getSettings(): Promise<BusinessSettings> {
  const s = await (await repo()).get<BusinessSettings>("settings", "business");
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(settings: BusinessSettings) {
  await (await repo()).put("settings", "business", settings);
}

/* -------------------------------- services -------------------------------- */

export async function listServices(opts: { activeOnly?: boolean } = {}): Promise<Service[]> {
  const all = await (await repo()).list<Service>("service");
  const sorted = all.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return opts.activeOnly ? sorted.filter((s) => s.active) : sorted;
}

export async function getService(id: string) {
  return (await repo()).get<Service>("service", id);
}

export async function saveService(input: Omit<Service, "id"> & { id?: string }) {
  const service: Service = { ...input, id: input.id || uid("svc") };
  await (await repo()).put("service", service.id, service);
  return service;
}

export async function deleteService(id: string) {
  await (await repo()).remove("service", id);
}

/* -------------------------------- customers ------------------------------- */

export const normalizePhone = (phone: string) => {
  if (!/^\+?[\d\s().-]+$/.test(phone)) return phone.trim(); // web / voice session ids
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : phone.trim();
};

const customerId = (phone: string) => `c_${normalizePhone(phone).replace(/\W/g, "") || uid("anon")}`;

export async function findCustomerByPhone(phone: string) {
  return (await repo()).get<Customer>("customer", customerId(phone));
}

export async function getCustomer(id: string) {
  return (await repo()).get<Customer>("customer", id);
}

export async function upsertCustomer(phone: string, name: string): Promise<Customer> {
  const r = await repo();
  const id = customerId(phone);
  const existing = await r.get<Customer>("customer", id);
  const customer: Customer = existing
    ? { ...existing, name: name || existing.name }
    : { id, name, phone: normalizePhone(phone), createdAt: new Date().toISOString() };
  await r.put("customer", id, customer, { ts: customer.createdAt });
  return customer;
}

export async function listCustomers() {
  return (await repo()).list<Customer>("customer", { order: "desc" });
}

/* ------------------------------ appointments ------------------------------ */

export async function listAppointments(range: { from?: string; to?: string } = {}) {
  return (await repo()).list<Appointment>("appointment", range);
}

export async function getAppointment(id: string) {
  return (await repo()).get<Appointment>("appointment", id);
}

export async function saveAppointment(input: Omit<Appointment, "id" | "createdAt"> & Partial<Pick<Appointment, "id" | "createdAt">>) {
  const appointment: Appointment = {
    ...input,
    id: input.id ?? uid("apt"),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  await (await repo()).put("appointment", appointment.id, appointment, { ts: appointment.start });
  return appointment;
}

export async function upcomingForCustomer(customerIdValue: string, now = new Date()) {
  const items = await listAppointments({ from: now.toISOString() });
  return items.filter((a) => a.customerId === customerIdValue && (a.status === "booked" || a.status === "confirmed"));
}

/* ------------------------------ conversations ----------------------------- */

export async function getConversation(id: string) {
  return (await repo()).get<Conversation>("conversation", id);
}

export async function getOrCreateConversation(input: { id: string; channel: Channel; phone: string; name?: string }) {
  const existing = await getConversation(input.id);
  if (existing) return existing;
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: input.id,
    channel: input.channel,
    customerPhone: input.phone,
    customerName: input.name ?? "",
    state: { step: "idle", intent: null },
    humanTakeover: false,
    lastMessage: "",
    unread: 0,
    updatedAt: now,
    createdAt: now,
  };
  await saveConversation(conversation);
  return conversation;
}

export async function saveConversation(c: Conversation) {
  await (await repo()).put("conversation", c.id, c, { ts: c.updatedAt });
}

export async function listConversations(limit = 100) {
  return (await repo()).list<Conversation>("conversation", { order: "desc", limit });
}

export async function listMessages(conversationId: string, limit = 200) {
  const recent = await (await repo()).list<Message>("message", { parent: conversationId, order: "desc", limit });
  return recent.reverse();
}

export async function addMessage(conversationId: string, role: MessageRole, text: string) {
  const message: Message = { id: uid("msg"), conversationId, role, text, createdAt: new Date().toISOString() };
  await (await repo()).put("message", message.id, message, { ts: message.createdAt, parent: conversationId });
  return message;
}
