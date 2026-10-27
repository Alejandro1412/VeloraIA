/**
 * Rule-based receptionist. Runs fully offline (no API key required) and is
 * also the safety net when the LLM provider is unavailable.
 *
 * Pure with respect to I/O: all side effects come in through `AgentDeps`,
 * which keeps the dialog logic unit-testable.
 */
import { nearestSlots, spreadSlots, type Slot } from "./availability";
import { BookingError } from "./booking-errors";
import { detectIntents, matchService, parseChoice, parseDate, parseName, parseTime } from "./nlu";
import { addDays, formatDateEs, formatMoney, formatTimeEs, localParts, relativeDayEs, WEEKDAYS_ES } from "./time";
import type { AgentState, Appointment, BusinessSettings, Service, Staff } from "./types";
import { normalize } from "./nlu";

export interface AgentDeps {
  now: Date;
  settings: BusinessSettings;
  services: Service[];
  customerName?: string;
  /** Active professionals; lets customers ask for someone by name. */
  staff?: Staff[];
  slots(serviceId: string, date: string, excludeAppointmentId?: string, staffId?: string): Promise<Slot[]>;
  book(input: { serviceId: string; start: string; name: string; staffId?: string }): Promise<Appointment>;
  /** Payment link for a pending deposit, when the business collects one. */
  paymentLink?(appointment: Appointment): string | null;
  joinWaitlist?(input: { serviceId: string; date: string; name: string }): Promise<void>;
  reschedule(id: string, start: string): Promise<Appointment>;
  cancel(id: string): Promise<Appointment>;
  confirm(id: string): Promise<Appointment>;
  upcoming(): Promise<Appointment[]>;
  /** Source of randomness for varied wording (tests pass a fixed one). */
  random?: () => number;
}

export interface AgentResult {
  reply: string;
  state: AgentState;
  handoff?: boolean;
  customerName?: string;
  event?: "booked" | "rescheduled" | "cancelled" | "confirmed";
}

const IDLE: AgentState = { step: "idle", intent: null };

export async function respond(text: string, prev: AgentState, deps: AgentDeps): Promise<AgentResult> {
  const r = new Receptionist(deps);
  return r.handle(text, prev ?? IDLE);
}

class Receptionist {
  private today: string;
  constructor(private d: AgentDeps) {
    this.today = localParts(d.now, d.settings.utcOffsetMinutes).date;
  }

  /** Picks one of several equivalent phrasings so replies don't feel canned. */
  private pick(...options: string[]): string {
    const rnd = this.d.random ?? Math.random;
    return options[Math.min(options.length - 1, Math.floor(rnd() * options.length))];
  }

  private get services() {
    return this.d.services.filter((s) => s.active);
  }
  private service(id?: string) {
    return this.services.find((s) => s.id === id);
  }
  private local(iso: string) {
    return localParts(iso, this.d.settings.utcOffsetMinutes);
  }
  private staffName(id?: string) {
    return this.d.staff?.find((s) => s.id === id)?.name;
  }
  /** "con la doctora Ana", "con Carlos" → staff id. */
  private matchStaff(text: string): string | undefined {
    const t = normalize(text);
    for (const s of this.d.staff ?? []) {
      const first = normalize(s.name).split(" ").filter((w) => !["dr", "dra", "doctor", "doctora"].includes(w.replace(".", "")))[0];
      if (first && first.length > 2 && new RegExp(`\\b${first}\\b`).test(t)) return s.id;
    }
    return undefined;
  }
  private when(iso: string) {
    const p = this.local(iso);
    return `${relativeDayEs(p.date, this.today)} a las ${formatTimeEs(p.time)}`;
  }

  async handle(text: string, state: AgentState): Promise<AgentResult> {
    const intents = detectIntents(text);

    // Switching intent always wins over the current step.
    if (intents.has("cancel") && state.intent !== "cancel") return this.startManage("cancel");
    if (intents.has("reschedule") && state.intent !== "reschedule") return this.startManage("reschedule");
    if (intents.has("human")) {
      return {
        reply: this.pick(
          `Con gusto te comunico con el equipo de ${this.d.settings.name}. Una persona te responderá por este mismo chat en breve 🙌`,
          `¡Claro! Ya le aviso al equipo de ${this.d.settings.name}. Alguien te escribe por aquí mismo en un momento.`,
          `Entendido, te paso con una persona del equipo. Te responden por este chat muy pronto 🙌`,
          `Por supuesto. Dejé tu mensaje con el equipo de ${this.d.settings.name} y te contestan aquí en breve.`,
        ),
        state: IDLE,
        handoff: true,
      };
    }

    switch (state.step) {
      case "service":
        return this.onService(text, state);
      case "date":
        return this.onDate(text, state);
      case "time":
        return this.onTime(text, state);
      case "name":
        return this.onName(text, state);
      case "confirm":
        return this.onConfirm(text, state, intents);
      case "pick_appointment":
        return this.onPickAppointment(text, state);
      case "confirm_cancel":
        return this.onConfirmCancel(state, intents);
      case "waitlist":
        return this.onWaitlist(text, state, intents);
      default:
        return this.onIdle(text, intents);
    }
  }

  /* --------------------------------- idle --------------------------------- */

  private async onIdle(text: string, intents: Set<string>): Promise<AgentResult> {
    if (intents.has("confirm_attendance")) {
      const next = (await this.d.upcoming()).find((a) => a.status === "booked");
      if (next) {
        await this.d.confirm(next.id);
        return {
          reply: this.pick(
            `¡Gracias por confirmar! Te esperamos ${this.when(next.start)} ✅`,
            `¡Perfecto, quedó confirmada! Nos vemos ${this.when(next.start)} 😊`,
            `Confirmado ✅ Te esperamos ${this.when(next.start)}. ¡Gracias por avisar!`,
          ),
          state: IDLE,
          event: "confirmed",
        };
      }
    }
    if (intents.has("my_appointments")) return this.listMine();
    if (intents.has("services") && !intents.has("book")) return { reply: this.servicesText(), state: IDLE };
    if (intents.has("hours")) return { reply: this.hoursText(), state: IDLE };
    if (intents.has("location")) {
      const s = this.d.settings;
      if (!s.address) return { reply: `Te comparto la dirección enseguida. Si quieres, te comunico con el equipo de ${s.name}.`, state: IDLE };
      return { reply: `Estamos en *${s.address}*.${s.mapsUrl ? `\nAsí llegas: ${s.mapsUrl}` : ""}`, state: IDLE };
    }

    const wantsToBook =
      intents.has("book") || !!matchService(text, this.services) || !!parseDate(text, this.today) || !!parseTime(text);
    if (wantsToBook) return this.advance({ step: "service", intent: "book" }, text);

    if (intents.has("thanks")) {
      return {
        reply: this.pick(
          "¡Con gusto! Si necesitas algo más, aquí estoy 😊",
          "¡A ti! Cualquier cosa me escribes 🙌",
          "Para eso estoy. ¡Que tengas un lindo día!",
          "¡Con mucho gusto! Aquí sigo si se te ofrece algo más.",
        ),
        state: IDLE,
      };
    }
    if (intents.has("greeting")) {
      const name = this.d.customerName?.split(" ")[0];
      const welcome = name
        ? this.pick(
            `¡Hola ${name}! Soy ${this.d.settings.assistantName} de ${this.d.settings.name}. ¿Quieres agendar, mover o cancelar una cita?`,
            `¡Qué gusto saludarte, ${name}! ¿En qué te ayudo hoy?`,
            `¡Hola de nuevo, ${name}! 😊 ¿Agendamos algo o necesitas cambiar una cita?`,
          )
        : this.pick(
            this.d.settings.welcomeMessage,
            `¡Hola! Soy ${this.d.settings.assistantName} de ${this.d.settings.name} 👋 ¿En qué te puedo ayudar?`,
            `¡Buenas! Te habla ${this.d.settings.assistantName}, de ${this.d.settings.name}. ¿Quieres agendar una cita o tienes alguna pregunta?`,
          );
      return { reply: welcome, state: IDLE };
    }
    return {
      reply:
        this.pick("Puedo ayudarte a:", "No estoy segura de haberte entendido 🙈 Esto es lo que puedo hacer por ti:", "Te cuento en qué te ayudo:") +
        `\n• *Agendar* una cita\n• *Reprogramar* o *cancelar* tu cita\n• Ver *servicios y precios*\n• Conocer *horarios* y *dirección*\n\n` +
        `Por ejemplo: "Quiero una limpieza el viernes a las 3".`,
      state: IDLE,
    };
  }

  /* ------------------------------ booking flow ----------------------------- */

  /** Fills whatever the message provides, then asks for the next missing piece. */
  private async advance(state: AgentState, text: string): Promise<AgentResult> {
    const s: AgentState = { ...state };

    if (s.intent === "book" && !s.serviceId) {
      const svc = matchService(text, this.services);
      if (svc) s.serviceId = svc.id;
    }
    const preferred = this.matchStaff(text);
    if (preferred) s.staffId = preferred;
    if (!s.serviceId) {
      return {
        reply:
          this.pick("¡Claro! ¿Qué servicio necesitas?", "¡Con gusto! ¿Para qué servicio sería?", "¡Listo! Cuéntame, ¿qué servicio quieres?") +
          `\n\n${this.servicesList()}\n\n` +
          this.pick("Responde con el número o el nombre.", "Puedes responder con el número o escribir el nombre.", "Escríbeme el número o el nombre del servicio."),
        state: { ...s, step: "service" },
      };
    }

    const svc = this.service(s.serviceId)!;
    const date = parseDate(text, this.today) ?? s.date;
    const time = parseTime(text);

    if (!date) return this.askDate(s, svc);

    const slots = await this.d.slots(svc.id, date, s.appointmentId, s.staffId);
    if (!slots.length) return this.noRoom(s, svc, date);

    s.date = date;
    if (time) {
      const exact = slots.find((x) => x.time === time);
      if (exact) return this.slotChosen(s, exact.start);
      const options = nearestSlots(slots, time, 3);
      return {
        reply:
          `A las ${formatTimeEs(time)} no tengo espacio ${relativeDayEs(date, this.today)}, pero sí tengo:\n\n` +
          `${this.numbered(options.map((o) => formatTimeEs(o.time)))}\n\n${this.pick("¿Te sirve alguna?", "¿Alguna te queda bien?", "¿Cuál te acomoda?")}`,
        state: { ...s, step: "time", offeredSlots: options.map((o) => o.start) },
      };
    }

    const options = spreadSlots(slots, 6);
    const withWho = s.staffId ? ` con ${this.staffName(s.staffId)}` : "";
    return {
      reply:
        `Para *${svc.name}*${withWho} ${relativeDayEs(date, this.today)} tengo:\n\n` +
        `${this.numbered(options.map((o) => formatTimeEs(o.time)))}\n\n` +
        this.pick(
          "¿Cuál prefieres? También puedes escribir otra hora.",
          "¿Cuál te sirve más? Si quieres otra hora, escríbemela.",
          "Elige una, o dime la hora que te quede mejor.",
        ),
      state: { ...s, step: "time", offeredSlots: options.map((o) => o.start) },
    };
  }

  private async askDate(s: AgentState, svc: Service): Promise<AgentResult> {
    const days = await this.openDays(svc.id, s.appointmentId, this.today, s.staffId);
    return {
      reply:
        `${this.pick("Perfecto", "Muy bien", "Genial")}, *${svc.name}* (${svc.durationMinutes} min · ${formatMoney(svc.price, this.d.settings.currency)}). ${this.pick("¿Para qué día?", "¿Qué día te queda bien?", "¿Para cuándo la quieres?")}\n\n` +
        `Los próximos días con espacio son:\n${this.numbered(days.map((d) => relativeDayEs(d, this.today)))}`,
      state: { ...s, step: "date", offeredDates: days },
    };
  }

  private async noRoom(s: AgentState, svc: Service, date: string): Promise<AgentResult> {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const closed = !this.d.settings.hours[weekday];
    const days = await this.openDays(svc.id, s.appointmentId, date, s.staffId);
    const dayLabel = relativeDayEs(date, this.today);
    const why = closed
      ? `El ${WEEKDAYS_ES[weekday]} no atendemos`
      : `${dayLabel[0].toUpperCase()}${dayLabel.slice(1)} ya no me quedan espacios${s.staffId ? ` con ${this.staffName(s.staffId)}` : ""}`;
    const options = days.length
      ? `Te puedo ofrecer:\n\n${this.numbered(days.map((d) => relativeDayEs(d, this.today)))}\n\n¿Cuál te queda mejor?`
      : "No encuentro espacios en los próximos días.";
    // Offer the waitlist only for open days that are simply full.
    const canWait = !closed && s.intent === "book" && !!this.d.joinWaitlist;
    return {
      reply: `${why} 😕 ${options}${canWait ? `\n\nSi prefieres ese día, escribe *avísame* y te escribo si se libera un espacio.` : ""}`,
      state: { ...s, date: undefined, step: "date", offeredDates: days, waitDate: canWait ? date : undefined },
    };
  }

  private async openDays(serviceId: string, exclude?: string, from = this.today, staffId?: string) {
    const days: string[] = [];
    for (let i = 0; i <= this.d.settings.maxDaysAhead && days.length < 3; i++) {
      const date = addDays(from, i);
      if ((await this.d.slots(serviceId, date, exclude, staffId)).length) days.push(date);
    }
    return days;
  }

  private onService(text: string, s: AgentState) {
    const choice = parseChoice(text);
    const svc = choice ? this.services[choice - 1] : matchService(text, this.services);
    if (!svc) {
      return Promise.resolve({
        reply: `No identifiqué el servicio 🤔 Elige uno de la lista:\n\n${this.servicesList()}`,
        state: s,
      });
    }
    return this.advance({ ...s, serviceId: svc.id }, choice ? "" : text);
  }

  private onDate(text: string, s: AgentState) {
    if (s.waitDate && /\bavis(a|e)me\b|\blista de espera\b/.test(normalize(text))) {
      return this.onWaitlist("sí", { ...s, step: "waitlist" }, new Set(["yes"]));
    }
    const choice = parseChoice(text);
    if (choice && s.offeredDates?.[choice - 1]) {
      return this.advance({ ...s, date: s.offeredDates[choice - 1] }, "");
    }
    if (!parseDate(text, this.today)) {
      return Promise.resolve({
        reply: `¿Qué día te queda bien? Puedes decirme "mañana", "el viernes" o una fecha como "28/10".`,
        state: s,
      });
    }
    return this.advance(s, text);
  }

  private onTime(text: string, s: AgentState) {
    const choice = parseChoice(text);
    if (choice && s.offeredSlots?.[choice - 1]) return Promise.resolve(this.slotChosen(s, s.offeredSlots[choice - 1]));
    if (parseTime(text) || parseDate(text, this.today)) return this.advance(s, text);
    return Promise.resolve({
      reply: `Responde con el número de la opción (por ejemplo *1*) o escríbeme la hora que prefieres.`,
      state: s,
    });
  }

  private slotChosen(s: AgentState, slot: string): AgentResult {
    const next: AgentState = { ...s, slot, offeredSlots: undefined, offeredDates: undefined };
    const name = s.name ?? this.d.customerName;
    if (s.intent === "book" && !name) {
      return {
        reply: this.pick(
          `¡Excelente elección! ¿A nombre de quién agendo la cita?`,
          `¡Perfecto! ¿A nombre de quién la dejo?`,
          `¡Súper! Para reservarla, ¿me dices tu nombre completo?`,
          `¡Muy bien! ¿A nombre de quién agendo?`,
        ),
        state: { ...next, step: "name" },
      };
    }
    return this.summary({ ...next, name });
  }

  private onName(text: string, s: AgentState) {
    const name = parseName(text);
    if (!name) {
      return Promise.resolve({
        reply: this.pick(`¿Me compartes tu nombre completo, por favor?`, `¿Cómo es tu nombre completo?`, `Para la reserva necesito tu nombre y apellido 🙂`),
        state: s,
      });
    }
    return Promise.resolve({ ...this.summary({ ...s, name }), customerName: name });
  }

  private summary(s: AgentState): AgentResult {
    const svc = this.service(s.serviceId)!;
    const verb = s.intent === "reschedule" ? "Muevo tu cita de" : "Agendo";
    return {
      reply:
        `${verb} *${svc.name}* para *${this.when(s.slot!)}*` +
        (s.intent === "book" ? ` a nombre de *${s.name}*` : "") +
        `.\n\n${this.pick("¿Confirmo? (sí / no)", "¿Te la confirmo? (sí / no)", "¿Está bien así? (sí / no)")}`,
      state: { ...s, step: "confirm" },
    };
  }

  private async onConfirm(text: string, s: AgentState, intents: Set<string>): Promise<AgentResult> {
    if (intents.has("no")) {
      return {
        reply: this.pick(
          `Sin problema. ¿Qué día u hora prefieres entonces?`,
          `Tranquilo, lo ajustamos. ¿Qué día u hora te sirve más?`,
          `Dale, buscamos otra opción. ¿Qué día u hora prefieres?`,
        ),
        state: { ...s, step: "date", slot: undefined, date: undefined },
      };
    }
    if (!intents.has("yes")) {
      if (parseDate(text, this.today) || parseTime(text)) return this.advance({ ...s, slot: undefined }, text);
      return { reply: `¿Confirmo la cita? Responde *sí* o *no*.`, state: s };
    }

    try {
      const svc = this.service(s.serviceId)!;
      if (s.intent === "reschedule" && s.appointmentId) {
        const apt = await this.d.reschedule(s.appointmentId, s.slot!);
        return {
          reply: this.pick(
            `Listo ✅ Tu cita de *${svc.name}* quedó para *${this.when(apt.start)}*. Te enviaré un recordatorio antes.`,
            `¡Hecho! Moví tu *${svc.name}*: ahora quedó para *${this.when(apt.start)}* ✅`,
            `Perfecto, tu cita de *${svc.name}* ahora quedó para *${this.when(apt.start)}*. Te recuerdo antes 😉`,
          ),
          state: IDLE,
          event: "rescheduled",
        };
      }
      const apt = await this.d.book({
        serviceId: svc.id,
        start: s.slot!,
        name: s.name ?? this.d.customerName ?? "",
        staffId: s.staffId,
      });
      const who = this.staffName(apt.staffId);
      const link = apt.deposit?.status === "pending" ? this.d.paymentLink?.(apt) : null;
      const deposit = link
        ? `\n\nPara asegurar tu cupo paga el anticipo de *${formatMoney(apt.deposit!.amount, this.d.settings.currency)}* aquí (PSE, Nequi o tarjeta):\n${link}`
        : "";
      return {
        reply:
          `${this.pick("¡Cita agendada! ✅", "¡Listo, quedó agendada! ✅", "¡Tu cita está agendada! 🎉")}\n\n*${svc.name}*${who ? ` con ${who}` : ""}\n${this.when(apt.start)}${this.d.settings.address ? `\n${this.d.settings.address}` : ""}` +
          `${deposit}\n\n` +
          this.pick(
            `Te escribiré ${this.d.settings.reminderHoursBefore} horas antes para confirmar. Si necesitas cambiarla, solo dímelo.`,
            `Te mando un recordatorio ${this.d.settings.reminderHoursBefore} horas antes. Si algo cambia, me escribes y la movemos.`,
            `${this.d.settings.reminderHoursBefore} horas antes te escribo para confirmar. ¡Te esperamos!`,
          ),
        state: IDLE,
        event: "booked",
        customerName: s.name,
      };
    } catch (err) {
      if (err instanceof BookingError && err.code === "slot_taken") {
        const res = await this.advance({ ...s, slot: undefined }, "");
        return { ...res, reply: `${this.pick("Uy, alguien acaba de tomar ese horario 😅", "Ay, ese horario se acaba de ocupar 😅", "Justo alguien tomó ese espacio 🙈")} ${res.reply}` };
      }
      throw err;
    }
  }

  /* --------------------------- cancel / reschedule -------------------------- */

  private async startManage(intent: "cancel" | "reschedule"): Promise<AgentResult> {
    const upcoming = await this.d.upcoming();
    if (!upcoming.length) {
      return {
        reply: this.pick(
          `No encuentro citas próximas a tu nombre. ¿Quieres agendar una nueva?`,
          `No veo citas pendientes a tu nombre. ¿Te ayudo a agendar una?`,
        ),
        state: IDLE,
      };
    }
    if (upcoming.length === 1) return this.pickAppointment(intent, upcoming[0]);
    return {
      reply:
        `Tienes estas citas próximas:\n\n${this.numbered(upcoming.map((a) => `${this.service(a.serviceId)?.name ?? "Cita"} · ${this.when(a.start)}`))}\n\n` +
        `¿Cuál quieres ${intent === "cancel" ? "cancelar" : "mover"}?`,
      state: { step: "pick_appointment", intent, offeredAppointments: upcoming.map((a) => a.id) },
    };
  }

  private async onPickAppointment(text: string, s: AgentState): Promise<AgentResult> {
    const choice = parseChoice(text);
    const id = choice ? s.offeredAppointments?.[choice - 1] : undefined;
    const apt = id ? (await this.d.upcoming()).find((a) => a.id === id) : undefined;
    if (!apt) return { reply: `Responde con el número de la cita, por ejemplo *1*.`, state: s };
    return this.pickAppointment(s.intent as "cancel" | "reschedule", apt);
  }

  private async pickAppointment(intent: "cancel" | "reschedule", apt: Appointment): Promise<AgentResult> {
    const svc = this.service(apt.serviceId);
    if (intent === "cancel") {
      return {
        reply: `¿Confirmas que quieres cancelar tu cita de *${svc?.name ?? "servicio"}* ${this.when(apt.start)}? (sí / no)`,
        state: { step: "confirm_cancel", intent, appointmentId: apt.id },
      };
    }
    const base: AgentState = { step: "date", intent, appointmentId: apt.id, serviceId: apt.serviceId };
    const res = await this.askDate(base, svc ?? this.services[0]);
    const intro = this.pick(
      `Movamos tu cita de *${svc?.name}* (${this.when(apt.start)}).`,
      `Claro, cambiemos tu *${svc?.name}* de ${this.when(apt.start)}.`,
      `Listo, busquemos otro horario para tu *${svc?.name}* (hoy está ${this.when(apt.start)}).`,
    );
    return { ...res, reply: `${intro}\n\n${res.reply}` };
  }

  private async onConfirmCancel(s: AgentState, intents: Set<string>): Promise<AgentResult> {
    if (intents.has("yes") && s.appointmentId) {
      const apt = await this.d.cancel(s.appointmentId);
      return {
        reply: this.pick(
          `Tu cita del ${formatDateEs(this.local(apt.start).date)} quedó cancelada. Si quieres, te ayudo a buscar otro horario 🙂`,
          `Listo, cancelé tu cita del ${formatDateEs(this.local(apt.start).date)}. Cuando quieras agendamos otra 🙂`,
          `Hecho, tu cita del ${formatDateEs(this.local(apt.start).date)} quedó cancelada. ¿Te busco otro día?`,
        ),
        state: IDLE,
        event: "cancelled",
      };
    }
    if (intents.has("no")) {
      return { reply: this.pick(`Perfecto, tu cita sigue en pie 👍`, `¡Bien! La dejamos tal cual 👍`, `Listo, no la cancelo. ¡Te esperamos!`), state: IDLE };
    }
    return { reply: `¿Cancelo la cita? Responde *sí* o *no*.`, state: s };
  }

  /* -------------------------------- waitlist ------------------------------- */

  private async onWaitlist(text: string, s: AgentState, intents: Set<string>): Promise<AgentResult> {
    if (intents.has("no")) return { reply: `Perfecto. Si quieres otro día, dime cuál 🙂`, state: { ...s, step: "date" } };
    const name = s.name ?? this.d.customerName ?? parseName(text) ?? undefined;
    if (!name) return { reply: `¿A nombre de quién te anoto en la lista de espera?`, state: { ...s, step: "waitlist" } };
    await this.d.joinWaitlist!({ serviceId: s.serviceId!, date: s.waitDate!, name });
    return {
      reply: `Listo, ${name.split(" ")[0]}. Te anoté en la lista de espera para *${relativeDayEs(s.waitDate!, this.today)}*. Si se libera un espacio, te escribo 🙌`,
      state: IDLE,
      customerName: name,
    };
  }

  /* --------------------------------- info --------------------------------- */

  private async listMine(): Promise<AgentResult> {
    const upcoming = await this.d.upcoming();
    if (!upcoming.length) return { reply: `No tienes citas próximas. ¿Quieres agendar una?`, state: IDLE };
    return {
      reply: `Tus próximas citas:\n\n${upcoming
        .map((a) => `• *${this.service(a.serviceId)?.name ?? "Cita"}* — ${this.when(a.start)}`)
        .join("\n")}`,
      state: IDLE,
    };
  }

  private servicesList() {
    return this.services
      .map((s, i) => `${i + 1}. ${s.name} — ${formatMoney(s.price, this.d.settings.currency)} (${s.durationMinutes} min)`)
      .join("\n");
  }

  private servicesText() {
    return (
      `${this.pick("Estos son nuestros servicios:", "Te cuento lo que ofrecemos:", "Mira nuestros servicios y precios:")}\n\n${this.servicesList()}\n\n` +
      this.pick("¿Quieres agendar alguno?", "¿Te agendo alguno?", "Si alguno te interesa, te busco horario 😊")
    );
  }

  private hoursText() {
    const h = this.d.settings.hours;
    const lines = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const day = WEEKDAYS_ES[d][0].toUpperCase() + WEEKDAYS_ES[d].slice(1);
      const x = h[d];
      return `${day}: ${x ? `${formatTimeEs(x.open)} – ${formatTimeEs(x.close)}` : "cerrado"}`;
    });
    return `Nuestro horario:\n\n${lines.join("\n")}\n\n${this.pick("Por aquí agendo las 24 horas 😉", "Pero por este chat puedes agendar a cualquier hora 😉", "Y por aquí te atiendo 24/7 para agendar.")}`;
  }

  private numbered(items: string[]) {
    return items.map((x, i) => `${i + 1}. ${x}`).join("\n");
  }
}
