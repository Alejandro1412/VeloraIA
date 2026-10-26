import "server-only";
import { getRepo } from "./repo";
import { buildDemoData, DEFAULT_SERVICES, DEFAULT_SETTINGS, servicesForVertical } from "./seed";
import { currentBusinessId, DEMO_BUSINESS_ID } from "../tenant";
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
 * Data access layer for one business. Every function resolves the active
 * business (tenant) and reads/writes only that business' collections, so a
 * query can never cross into another customer's agenda.
 */

type Collection = "settings" | "service" | "customer" | "appointment" | "conversation" | "message";

const scopedKind = (businessId: string, collection: Collection) => `${businessId}:${collection}`;

const demoSeeding = new Map<string, Promise<void>>();

/** The public demo business seeds itself with a realistic agenda on first use. */
async function ensureDemoSeeded() {
  let p = demoSeeding.get(DEMO_BUSINESS_ID);
  if (!p) {
    p = (async () => {
      const repo = getRepo();
      const k = (c: Collection) => scopedKind(DEMO_BUSINESS_ID, c);
      if (await repo.get<BusinessSettings>(k("settings"), "business")) return;
      await repo.put(k("settings"), "business", DEFAULT_SETTINGS);
      for (const s of DEFAULT_SERVICES) await repo.put(k("service"), s.id, s);
      const demo = buildDemoData(new Date());
      await Promise.all([
        ...demo.customers.map((c) => repo.put(k("customer"), c.id, c, { ts: c.createdAt })),
        ...demo.appointments.map((a) => repo.put(k("appointment"), a.id, a, { ts: a.start })),
        ...demo.conversations.map((c) => repo.put(k("conversation"), c.id, c, { ts: c.updatedAt })),
        ...demo.messages.map((m) => repo.put(k("message"), m.id, m, { ts: m.createdAt, parent: m.conversationId })),
      ]);
    })().catch((err) => {
      demoSeeding.delete(DEMO_BUSINESS_ID);
      throw err;
    });
    demoSeeding.set(DEMO_BUSINESS_ID, p);
  }
  return p;
}

/** Repository bound to the active business. */
async function scope() {
  const businessId = await currentBusinessId();
  if (businessId === DEMO_BUSINESS_ID) await ensureDemoSeeded();
  const repo = getRepo();
  const k = (c: Collection) => scopedKind(businessId, c);
  return { businessId, repo, k };
}

/** Writes the starting configuration for a brand-new business. */
export async function initializeBusiness(businessId: string, settings: Partial<BusinessSettings>) {
  const repo = getRepo();
  const k = (c: Collection) => scopedKind(businessId, c);
  const welcomeName = settings.name ?? DEFAULT_SETTINGS.name;
  await repo.put(k("settings"), "business", {
    ...DEFAULT_SETTINGS,
    ...settings,
    welcomeMessage: `¡Hola! Soy Sofía, la asistente de ${welcomeName}. Puedo agendar, mover o cancelar tu cita en segundos. ¿En qué te ayudo?`,
    extraInstructions: "",
    address: settings.address ?? "",
    mapsUrl: settings.mapsUrl ?? "",
    phone: settings.phone ?? "",
  } satisfies BusinessSettings);
  for (const s of servicesForVertical(settings.vertical ?? "")) await repo.put(k("service"), s.id, s);
}

export const storageDriver = () => getRepo().driver;

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;

/* -------------------------------- settings -------------------------------- */

export async function getSettings(): Promise<BusinessSettings> {
  const { repo, k } = await scope();
  const s = await repo.get<BusinessSettings>(k("settings"), "business");
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(settings: BusinessSettings) {
  const { repo, k } = await scope();
  await repo.put(k("settings"), "business", settings);
}

/* -------------------------------- services -------------------------------- */

export async function listServices(opts: { activeOnly?: boolean } = {}): Promise<Service[]> {
  const { repo, k } = await scope();
  const all = await repo.list<Service>(k("service"));
  const sorted = all.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return opts.activeOnly ? sorted.filter((s) => s.active) : sorted;
}

export async function getService(id: string) {
  const { repo, k } = await scope();
  return repo.get<Service>(k("service"), id);
}

export async function saveService(input: Omit<Service, "id"> & { id?: string }) {
  const { repo, k } = await scope();
  const service: Service = { ...input, id: input.id || uid("svc") };
  await repo.put(k("service"), service.id, service);
  return service;
}

export async function deleteService(id: string) {
  const { repo, k } = await scope();
  await repo.remove(k("service"), id);
}

/* -------------------------------- customers ------------------------------- */

export const normalizePhone = (phone: string) => {
  if (!/^\+?[\d\s().-]+$/.test(phone)) return phone.trim(); // web / voice session ids
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : phone.trim();
};

const customerId = (phone: string) => `c_${normalizePhone(phone).replace(/\W/g, "") || uid("anon")}`;

export async function findCustomerByPhone(phone: string) {
  const { repo, k } = await scope();
  return repo.get<Customer>(k("customer"), customerId(phone));
}

export async function getCustomer(id: string) {
  const { repo, k } = await scope();
  return repo.get<Customer>(k("customer"), id);
}

export async function upsertCustomer(phone: string, name: string): Promise<Customer> {
  const { repo, k } = await scope();
  const id = customerId(phone);
  const existing = await repo.get<Customer>(k("customer"), id);
  const customer: Customer = existing
    ? { ...existing, name: name || existing.name }
    : { id, name, phone: normalizePhone(phone), createdAt: new Date().toISOString() };
  await repo.put(k("customer"), id, customer, { ts: customer.createdAt });
  return customer;
}

export async function listCustomers() {
  const { repo, k } = await scope();
  return repo.list<Customer>(k("customer"), { order: "desc" });
}

/* ------------------------------ appointments ------------------------------ */

export async function listAppointments(range: { from?: string; to?: string } = {}) {
  const { repo, k } = await scope();
  return repo.list<Appointment>(k("appointment"), range);
}

export async function getAppointment(id: string) {
  const { repo, k } = await scope();
  return repo.get<Appointment>(k("appointment"), id);
}

export async function saveAppointment(
  input: Omit<Appointment, "id" | "createdAt"> & Partial<Pick<Appointment, "id" | "createdAt">>,
) {
  const { repo, k } = await scope();
  const appointment: Appointment = {
    ...input,
    id: input.id ?? uid("apt"),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  await repo.put(k("appointment"), appointment.id, appointment, { ts: appointment.start });
  return appointment;
}

export async function upcomingForCustomer(customerIdValue: string, now = new Date()) {
  const items = await listAppointments({ from: now.toISOString() });
  return items.filter((a) => a.customerId === customerIdValue && (a.status === "booked" || a.status === "confirmed"));
}

/* ------------------------------ conversations ----------------------------- */

export async function getConversation(id: string) {
  const { repo, k } = await scope();
  return repo.get<Conversation>(k("conversation"), id);
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
  const { repo, k } = await scope();
  await repo.put(k("conversation"), c.id, c, { ts: c.updatedAt });
}

export async function listConversations(limit = 100) {
  const { repo, k } = await scope();
  return repo.list<Conversation>(k("conversation"), { order: "desc", limit });
}

export async function listMessages(conversationId: string, limit = 200) {
  const { repo, k } = await scope();
  const recent = await repo.list<Message>(k("message"), { parent: conversationId, order: "desc", limit });
  return recent.reverse();
}

export async function addMessage(conversationId: string, role: MessageRole, text: string) {
  const { repo, k } = await scope();
  const message: Message = { id: uid("msg"), conversationId, role, text, createdAt: new Date().toISOString() };
  await repo.put(k("message"), message.id, message, { ts: message.createdAt, parent: conversationId });
  return message;
}
