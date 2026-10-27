/**
 * Core domain model for Velora.
 * Everything time-related is stored as ISO-8601 UTC strings and converted
 * to the business' local time only at the edges (UI, messages).
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface TimeRange {
  start: string; // "HH:mm" local
  end: string; // "HH:mm" local
}

export interface DayHours {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
  breaks: TimeRange[];
}

export interface IntakeField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  options?: string[];
  required?: boolean;
}

export interface BusinessSettings {
  name: string;
  vertical: string;
  phone: string;
  address: string;
  mapsUrl: string;
  /** Minutes east of UTC. Bogotá = -300. */
  utcOffsetMinutes: number;
  /** Index = weekday (0 Sunday). null = closed. */
  hours: (DayHours | null)[];
  /** How many appointments can happen in parallel (chairs, rooms, staff). */
  capacity: number;
  slotStepMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  reminderHoursBefore: number;
  assistantName: string;
  welcomeMessage: string;
  extraInstructions: string;
  currency: string;
  /** Meta phone-number ID whose inbound WhatsApp messages belong to this business. */
  whatsappPhoneNumberId?: string;
  /** Where to alert the owner about new bookings, cancellations and handoffs. */
  notifyEmail?: string;
  notifyWhatsapp?: string;
  /** Link customers get after a completed appointment to leave a Google review. */
  googleReviewUrl?: string;
  /** Business' own Wompi account, used to collect appointment deposits. */
  wompiPublicKey?: string;
  wompiIntegritySecret?: string;
  wompiEventsSecret?: string;
  /** Secret token for the read-only calendar feed (.ics). */
  calendarToken?: string;
  /** Questions the customer answers before the visit (from their appointment link). */
  intakeFields?: IntakeField[];
}

/** A person (or chair/room) appointments are booked with. */
export interface Staff {
  id: string;
  name: string;
  /** Services this professional performs. Empty = all services. */
  serviceIds: string[];
  /** Weekdays (0 = Sunday) this professional does not work. */
  daysOff: number[];
  color: string;
  active: boolean;
}

/** Dates the business is closed (holidays, vacations). Optionally for one professional only. */
export interface Closure {
  id: string;
  from: string; // YYYY-MM-DD local, inclusive
  to: string; // YYYY-MM-DD local, inclusive
  reason: string;
  staffId?: string;
}

export interface WaitlistEntry {
  id: string;
  customerPhone: string;
  customerName: string;
  serviceId: string;
  date: string; // YYYY-MM-DD local
  conversationId: string;
  createdAt: string;
  notifiedAt: string | null;
}

export type NotificationKind = "booked" | "rescheduled" | "cancelled" | "confirmed" | "handoff" | "deposit_paid" | "waitlist" | "feedback";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  description: string;
  keywords: string[];
  active: boolean;
  /** Weekdays (0 = Sunday) the service is offered. Empty/undefined = every open day. */
  days?: number[];
  /** Cleanup/prep time blocked after each appointment. */
  bufferMinutes?: number;
  /** Deposit required to secure the booking (COP). 0/undefined = none. */
  depositAmount?: number;
  /** Package size: sessions sold together (e.g. 10 physiotherapy sessions). 1/undefined = single. */
  sessions?: number;
  /** Suggested return interval: after this many months a "time for your next visit" message is sent. */
  recallMonths?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  notes?: string;
}

export interface Deposit {
  amount: number;
  status: "pending" | "paid" | "waived";
  reference: string;
  paidAt?: string;
}

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "nequi" | "daviplata" | "otro";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  nequi: "Nequi",
  daviplata: "Daviplata",
  otro: "Otro",
};

export type Channel = "whatsapp" | "web" | "voice" | "manual";

export interface Appointment {
  id: string;
  serviceId: string;
  customerId: string;
  start: string; // ISO UTC
  end: string; // ISO UTC
  status: AppointmentStatus;
  source: Channel;
  notes: string;
  reminderSentAt: string | null;
  createdAt: string;
  staffId?: string;
  deposit?: Deposit;
  reviewRequestedAt?: string | null;
  /** Recurring appointments / packages: the series and this session's position. */
  seriesId?: string;
  seriesIndex?: number;
  seriesTotal?: number;
  /** Satisfaction survey. */
  surveySentAt?: string | null;
  /** When the "time for your next visit" message for this visit was sent. */
  recallSentAt?: string | null;
  /** Answers to the pre-visit form, keyed by field id. */
  intake?: Record<string, string | boolean>;
  intakeAt?: string;
  /** Payment registered at the front desk when the visit is completed. */
  payment?: { amount: number; method: PaymentMethod; at: string };
  rating?: number;
  feedback?: string;
  ratedAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  monthsInactive: number;
  serviceId?: string;
  recipients: { customerId: string; name: string; phone: string; status: "sent" | "failed" | "manual" }[];
  createdAt: string;
}

export type MessageRole = "customer" | "assistant" | "staff";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  text: string;
  createdAt: string;
}

/** Dialog state used by the rule-based receptionist. */
export interface AgentState {
  step:
    | "idle"
    | "service"
    | "date"
    | "time"
    | "name"
    | "confirm"
    | "pick_appointment"
    | "confirm_cancel"
    | "waitlist";
  intent: "book" | "reschedule" | "cancel" | null;
  serviceId?: string;
  date?: string; // YYYY-MM-DD local
  slot?: string; // ISO UTC
  offeredSlots?: string[];
  offeredDates?: string[];
  offeredAppointments?: string[];
  appointmentId?: string;
  name?: string;
  staffId?: string;
  /** Full day the customer asked for, offered via the waitlist. */
  waitDate?: string;
}

export interface Conversation {
  id: string;
  channel: Channel;
  customerPhone: string;
  customerName: string;
  state: AgentState;
  humanTakeover: boolean;
  lastMessage: string;
  unread: number;
  updatedAt: string;
  createdAt: string;
}

export const ACTIVE_STATUSES: AppointmentStatus[] = ["booked", "confirmed"];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: "Agendada",
  confirmed: "Confirmada",
  completed: "Atendida",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  web: "Web",
  voice: "Llamada",
  manual: "Recepción",
};
