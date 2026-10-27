import type {
  Appointment,
  AppointmentStatus,
  BusinessSettings,
  Channel,
  Conversation,
  Customer,
  Message,
  Service,
} from "../domain/types";
import { addDays, localParts, localToUtc } from "../domain/time";

export const DEFAULT_SETTINGS: BusinessSettings = {
  name: "Clínica Dental Sonríe",
  vertical: "Odontología",
  phone: "+57 302 555 0148",
  address: "Av. 6 Norte #25-40, Consultorio 302, Cali",
  mapsUrl: "https://maps.google.com/?q=Av.+6+Norte+25-40+Cali",
  utcOffsetMinutes: -300,
  hours: [
    null,
    { open: "08:00", close: "18:00", breaks: [{ start: "12:30", end: "14:00" }] },
    { open: "08:00", close: "18:00", breaks: [{ start: "12:30", end: "14:00" }] },
    { open: "08:00", close: "18:00", breaks: [{ start: "12:30", end: "14:00" }] },
    { open: "08:00", close: "18:00", breaks: [{ start: "12:30", end: "14:00" }] },
    { open: "08:00", close: "17:00", breaks: [{ start: "12:30", end: "14:00" }] },
    { open: "08:00", close: "13:00", breaks: [] },
  ],
  capacity: 2,
  slotStepMinutes: 30,
  minNoticeMinutes: 60,
  maxDaysAhead: 45,
  reminderHoursBefore: 24,
  assistantName: "Sofía",
  welcomeMessage:
    "¡Hola! Soy Sofía, la asistente de Clínica Dental Sonríe. Puedo agendar, mover o cancelar tu cita en segundos. ¿En qué te ayudo?",
  extraInstructions:
    "Si alguien reporta dolor fuerte, sangrado o un golpe, ofrécele primero la cita de urgencia más cercana.",
  currency: "COP",
};

export const DEFAULT_SERVICES: Service[] = [
  {
    id: "svc_valoracion",
    name: "Valoración general",
    durationMinutes: 30,
    price: 0,
    description: "Revisión completa y plan de tratamiento.",
    keywords: ["valoracion", "revision", "chequeo", "consulta", "primera vez", "evaluacion"],
    active: true,
    recallMonths: 12,
  },
  {
    id: "svc_limpieza",
    name: "Limpieza dental",
    durationMinutes: 60,
    price: 120000,
    description: "Profilaxis, retiro de sarro y pulido.",
    keywords: ["limpieza", "profilaxis", "sarro", "higiene"],
    active: true,
    recallMonths: 6,
  },
  {
    id: "svc_blanqueamiento",
    name: "Blanqueamiento",
    durationMinutes: 90,
    price: 450000,
    description: "Blanqueamiento en consultorio con luz LED.",
    keywords: ["blanqueamiento", "blanquear", "dientes blancos", "aclarar"],
    active: true,
  },
  {
    id: "svc_ortodoncia",
    name: "Control de ortodoncia",
    durationMinutes: 30,
    price: 90000,
    description: "Ajuste mensual de brackets o alineadores.",
    keywords: ["ortodoncia", "brackets", "frenillos", "control", "alineadores", "ajuste"],
    active: true,
    recallMonths: 1,
  },
  {
    id: "svc_urgencia",
    name: "Urgencia",
    durationMinutes: 30,
    price: 80000,
    description: "Atención prioritaria por dolor, golpe o sangrado.",
    keywords: ["urgencia", "dolor", "me duele", "emergencia", "golpe", "sangrado", "muela"],
    active: true,
  },
];

const NAMES = [
  "Valentina Ríos", "Santiago Muñoz", "Camila Herrera", "Andrés Castaño", "Daniela Ospina",
  "Juan Pablo Arias", "Laura Restrepo", "Mateo Cárdenas", "Isabella Mejía", "Sebastián Giraldo",
  "Mariana López", "Felipe Duque", "Sara Montoya", "Nicolás Vélez", "Paula Zapata",
  "Alejandro Rojas", "Gabriela Torres", "David Salazar", "Natalia Quintero", "Tomás Escobar",
];

/** Deterministic pseudo-random so demo data looks the same on every boot. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export interface SeedData {
  customers: Customer[];
  appointments: Appointment[];
  conversations: Conversation[];
  messages: Message[];
}

export function buildDemoData(now: Date, settings = DEFAULT_SETTINGS, services = DEFAULT_SERVICES): SeedData {
  const rand = rng(20261023);
  const today = localParts(now, settings.utcOffsetMinutes).date;
  const customers: Customer[] = NAMES.map((name, i) => ({
    id: `c_57300${String(1000000 + i * 7919).slice(0, 7)}`,
    name,
    phone: `+57300${String(1000000 + i * 7919).slice(0, 7)}`,
    createdAt: new Date(now.getTime() - (60 - i) * 86_400_000).toISOString(),
  }));

  const appointments: Appointment[] = [];
  const sources: Channel[] = ["whatsapp", "whatsapp", "whatsapp", "voice", "web", "manual"];
  const weights = [0.18, 0.32, 0.12, 0.26, 0.12];

  for (let offset = -21; offset <= 10; offset++) {
    const date = addDays(today, offset);
    const hours = settings.hours[new Date(`${date}T12:00:00Z`).getUTCDay()];
    if (!hours) continue;
    const perDay = offset < 0 ? 5 + Math.floor(rand() * 4) : Math.max(1, 6 - Math.floor(offset / 2) + Math.floor(rand() * 2));
    const used = new Set<string>();
    for (let k = 0; k < perDay; k++) {
      let r = rand();
      let svc = services[0];
      for (let s = 0; s < services.length; s++) {
        if ((r -= weights[s]) <= 0) {
          svc = services[s];
          break;
        }
      }
      const [oh] = hours.open.split(":").map(Number);
      const [ch] = hours.close.split(":").map(Number);
      const hour = oh + Math.floor(rand() * Math.max(1, ch - oh - 1));
      if (hour === 12 || hour === 13) continue;
      const minute = rand() > 0.5 ? "30" : "00";
      const time = `${String(hour).padStart(2, "0")}:${minute}`;
      if (used.has(time)) continue;
      used.add(time);

      const start = localToUtc(date, time, settings.utcOffsetMinutes);
      const end = new Date(start.getTime() + svc.durationMinutes * 60_000);
      let status: AppointmentStatus = "booked";
      if (end < now) status = rand() < 0.08 ? "no_show" : rand() < 0.06 ? "cancelled" : "completed";
      else if (offset <= 1 && rand() < 0.7) status = "confirmed";

      const customer = customers[Math.floor(rand() * customers.length)];
      appointments.push({
        id: `apt_${date.replaceAll("-", "")}_${time.replace(":", "")}_${k}`,
        serviceId: svc.id,
        customerId: customer.id,
        start: start.toISOString(),
        end: end.toISOString(),
        status,
        source: sources[Math.floor(rand() * sources.length)],
        notes: "",
        reminderSentAt: status !== "booked" && start.getTime() - now.getTime() < 86_400_000 ? start.toISOString() : null,
        createdAt: new Date(start.getTime() - (2 + Math.floor(rand() * 6)) * 86_400_000).toISOString(),
      });
    }
  }

  // Happy (and a few lukewarm) ratings on past visits.
  for (const apt of appointments) {
    if (apt.status === "completed" && rand() < 0.45) {
      const r = rand();
      apt.rating = r < 0.62 ? 5 : r < 0.88 ? 4 : 3;
      apt.ratedAt = apt.end;
    }
  }

  // Customers who stopped coming months ago: the audience for win-back campaigns.
  const dormant = ["Gloria Pineda", "Hernán Castaño", "Lucía Ospina", "Ricardo Mejía", "Paola Cárdenas", "Jorge Villa", "Natalia Arango", "Esteban Rojas"];
  // Customers whose 6-month cleaning is due now: the automatic "next visit" reminder.
  ["Sandra Molina", "Andrés Zapata", "Carolina Restrepo"].forEach((name, i) => {
    const phone = `+57302${String(3000000 + i * 5011).slice(0, 7)}`;
    const id = `c_${phone.slice(1)}`;
    const date = addDays(today, -(186 + i * 9));
    const start = localToUtc(date, "11:00", settings.utcOffsetMinutes);
    const svc = services.find((x) => x.id === "svc_limpieza") ?? services[0];
    customers.push({ id, name, phone, createdAt: new Date(start.getTime() - 20 * 86_400_000).toISOString() });
    appointments.push({
      id: `apt_old_r${i}`,
      serviceId: svc.id,
      customerId: id,
      start: start.toISOString(),
      end: new Date(start.getTime() + svc.durationMinutes * 60_000).toISOString(),
      status: "completed",
      source: "whatsapp",
      notes: "",
      reminderSentAt: null,
      createdAt: new Date(start.getTime() - 2 * 86_400_000).toISOString(),
      rating: 5,
    });
  });

  dormant.forEach((name, i) => {
    const phone = `+57301${String(2000000 + i * 4243).slice(0, 7)}`;
    const id = `c_${phone.slice(1)}`;
    const date = addDays(today, -(110 + i * 27));
    const start = localToUtc(date, i % 2 ? "10:00" : "15:30", settings.utcOffsetMinutes);
    const svc = services[i % services.length];
    customers.push({ id, name, phone, createdAt: new Date(start.getTime() - 30 * 86_400_000).toISOString() });
    appointments.push({
      id: `apt_old_${i}`,
      serviceId: svc.id,
      customerId: id,
      start: start.toISOString(),
      end: new Date(start.getTime() + svc.durationMinutes * 60_000).toISOString(),
      status: "completed",
      source: i % 3 ? "whatsapp" : "web",
      notes: "",
      reminderSentAt: null,
      createdAt: new Date(start.getTime() - 3 * 86_400_000).toISOString(),
      rating: 5,
    });
  });

  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  const tomorrow = addDays(today, 1);
  const chats: { customer: Customer; lines: [Message["role"], string, number][] }[] = [
    {
      customer: customers[2],
      lines: [
        ["customer", "Hola buenas noches, ¿tienen cita para limpieza mañana?", 22],
        ["assistant", `¡Hola Camila! Para mañana tengo estos espacios para Limpieza dental: 1) 8:00 a. m. 2) 10:30 a. m. 3) 3:00 p. m. ¿Cuál te sirve?`, 22],
        ["customer", "la 2", 21],
        ["assistant", "Listo ✅ Quedaste agendada mañana a las 10:30 a. m. para Limpieza dental. Te escribo un día antes para confirmar.", 21],
      ],
    },
    {
      customer: customers[7],
      lines: [
        ["customer", "Necesito mover mi control de brackets, no alcanzo a llegar", 95],
        ["assistant", "Claro, Mateo. ¿Para qué día te gustaría moverlo?", 95],
        ["customer", "el jueves en la tarde", 94],
        ["assistant", "El jueves tengo: 1) 2:00 p. m. 2) 3:30 p. m. 3) 5:00 p. m. ¿Cuál prefieres?", 94],
        ["customer", "5", 93],
        ["assistant", "Hecho. Tu control de ortodoncia quedó para el jueves a las 5:00 p. m. 🙌", 93],
      ],
    },
    {
      customer: customers[11],
      lines: [
        ["assistant", `Hola Felipe 👋 Te recordamos tu cita de Valoración general mañana ${tomorrow.slice(8)} a las 9:00 a. m. Responde CONFIRMO o escribe si necesitas cambiarla.`, 300],
        ["customer", "Confirmo, gracias!", 260],
        ["assistant", "¡Perfecto! Te esperamos. Recuerda llegar 10 minutos antes 😊", 260],
      ],
    },
  ];

  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  chats.forEach((chat, ci) => {
    const id = `wa_${chat.customer.phone.replace(/\D/g, "")}`;
    chat.lines.forEach(([role, text, ago], li) =>
      messages.push({ id: `${id}_m${li}`, conversationId: id, role, text, createdAt: minutesAgo(ago - li * 0.2) }),
    );
    const last = chat.lines[chat.lines.length - 1];
    conversations.push({
      id,
      channel: "whatsapp",
      customerPhone: chat.customer.phone,
      customerName: chat.customer.name,
      state: { step: "idle", intent: null },
      humanTakeover: false,
      lastMessage: last[1],
      unread: ci === 0 ? 1 : 0,
      updatedAt: minutesAgo(last[2]),
      createdAt: minutesAgo(chat.lines[0][2]),
    });
  });

  return { customers, appointments, conversations, messages };
}

type ServiceTemplate = [name: string, minutes: number, price: number, keywords: string[]];

/** Starter catalog per business type; owners edit it in Servicios. */
const TEMPLATES: Record<string, ServiceTemplate[]> = {
  "Odontología": DEFAULT_SERVICES.map((s) => [s.name, s.durationMinutes, s.price, s.keywords]),
  "Estética y spa": [
    ["Limpieza facial", 60, 120000, ["limpieza facial", "facial", "puntos negros"]],
    ["Masaje relajante", 60, 140000, ["masaje", "relajante", "spa"]],
    ["Manicure y pedicure", 90, 70000, ["manicure", "pedicure", "unas", "uñas"]],
    ["Depilación", 30, 50000, ["depilacion", "cera", "laser"]],
    ["Valoración estética", 30, 0, ["valoracion", "evaluacion", "consulta"]],
  ],
  "Veterinaria": [
    ["Consulta general", 30, 60000, ["consulta", "revision", "chequeo", "enfermo"]],
    ["Vacunación", 20, 50000, ["vacuna", "vacunacion", "refuerzo"]],
    ["Baño y peluquería", 90, 70000, ["baño", "bano", "peluqueria", "corte", "grooming"]],
    ["Desparasitación", 20, 35000, ["desparasitar", "desparasitacion", "pulgas"]],
    ["Urgencia", 30, 90000, ["urgencia", "emergencia", "vomito", "herida", "golpe"]],
  ],
  "Fisioterapia": [
    ["Valoración inicial", 45, 80000, ["valoracion", "evaluacion", "primera vez"]],
    ["Sesión de fisioterapia", 60, 90000, ["sesion", "terapia", "fisioterapia", "dolor"]],
    ["Terapia deportiva", 60, 110000, ["deportiva", "lesion", "esguince"]],
    ["Drenaje linfático", 60, 100000, ["drenaje", "linfatico"]],
  ],
  "Barbería y peluquería": [
    ["Corte de cabello", 30, 30000, ["corte", "cabello", "pelo"]],
    ["Corte y barba", 45, 45000, ["barba", "corte y barba", "perfilado"]],
    ["Tinte", 90, 90000, ["tinte", "color", "mechas"]],
    ["Cepillado", 45, 35000, ["cepillado", "planchado", "peinado"]],
  ],
  "Taller": [
    ["Diagnóstico", 60, 60000, ["diagnostico", "revision", "ruido", "falla"]],
    ["Cambio de aceite", 45, 120000, ["aceite", "cambio de aceite", "filtro"]],
    ["Alineación y balanceo", 60, 90000, ["alineacion", "balanceo", "llantas"]],
    ["Revisión de frenos", 60, 80000, ["frenos", "pastillas"]],
  ],
  "Consultorio médico": [
    ["Consulta general", 30, 90000, ["consulta", "medico", "cita medica", "chequeo"]],
    ["Control", 20, 60000, ["control", "seguimiento", "resultados"]],
    ["Procedimiento menor", 45, 150000, ["procedimiento", "curacion", "sutura"]],
  ],
};

const GENERIC: ServiceTemplate[] = [
  ["Primera cita", 30, 0, ["primera vez", "valoracion", "consulta"]],
  ["Cita estándar", 60, 80000, ["cita", "servicio", "sesion"]],
];

/** Sensible "come back in N months" defaults by service name. */
export function suggestedRecall(name: string): number | undefined {
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/limpieza dental|profilaxis/.test(n)) return 6;
  if (/ortodoncia|brackets/.test(n)) return 1;
  if (/valoracion|chequeo|control general|consulta general/.test(n)) return 12;
  if (/vacun/.test(n)) return 12;
  if (/desparasit/.test(n)) return 3;
  if (/bano|peluqueria canina|grooming/.test(n)) return 1;
  if (/corte|barba/.test(n)) return 1;
  if (/limpieza facial|facial/.test(n)) return 1;
  if (/cambio de aceite|mantenimiento/.test(n)) return 6;
  return undefined;
}

export function servicesForVertical(vertical: string): Service[] {
  return (TEMPLATES[vertical] ?? GENERIC).map(([name, durationMinutes, price, keywords], i) => ({
    id: `svc_${i + 1}_${name.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 16)}`,
    name,
    durationMinutes,
    price,
    description: "",
    keywords,
    active: true,
    recallMonths: suggestedRecall(name),
  }));
}
