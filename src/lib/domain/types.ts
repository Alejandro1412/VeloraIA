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
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  description: string;
  keywords: string[];
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

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
    | "confirm_cancel";
  intent: "book" | "reschedule" | "cancel" | null;
  serviceId?: string;
  date?: string; // YYYY-MM-DD local
  slot?: string; // ISO UTC
  offeredSlots?: string[];
  offeredDates?: string[];
  offeredAppointments?: string[];
  appointmentId?: string;
  name?: string;
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
