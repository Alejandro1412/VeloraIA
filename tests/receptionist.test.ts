import { test } from "node:test";
import assert from "node:assert/strict";
import { getSlots } from "../src/lib/domain/availability";
import { BookingError } from "../src/lib/domain/booking-errors";
import { parseDate, parseTime, parseChoice, matchService, parseName } from "../src/lib/domain/nlu";
import { respond, type AgentDeps } from "../src/lib/domain/receptionist";
import { localParts, localToUtc } from "../src/lib/domain/time";
import { DEFAULT_SERVICES, DEFAULT_SETTINGS } from "../src/lib/data/seed";
import type { AgentState, Appointment } from "../src/lib/domain/types";

// Thursday 2026-10-22, 20:00 Bogotá
const NOW = localToUtc("2026-10-22", "20:00", -300);
const TODAY = "2026-10-22";

function fakeDeps(initial: Appointment[] = [], customerName?: string) {
  const agenda = [...initial];
  const deps: AgentDeps = {
    now: NOW,
    random: () => 0,
    settings: DEFAULT_SETTINGS,
    services: DEFAULT_SERVICES,
    customerName,
    async slots(serviceId, date, exclude) {
      const service = DEFAULT_SERVICES.find((s) => s.id === serviceId)!;
      return getSlots({ date, service, settings: DEFAULT_SETTINGS, appointments: agenda, now: NOW, excludeAppointmentId: exclude });
    },
    async book({ serviceId, start }) {
      const service = DEFAULT_SERVICES.find((s) => s.id === serviceId)!;
      const free = await deps.slots(serviceId, localParts(start, -300).date);
      if (!free.some((s) => s.start === start)) throw new BookingError("slot_taken", "taken");
      const apt: Appointment = {
        id: `a${agenda.length}`, serviceId, customerId: "me", start,
        end: new Date(new Date(start).getTime() + service.durationMinutes * 60_000).toISOString(),
        status: "booked", source: "web", notes: "", reminderSentAt: null, createdAt: NOW.toISOString(),
      };
      agenda.push(apt);
      return apt;
    },
    async reschedule(id, start) {
      const a = agenda.find((x) => x.id === id)!;
      a.start = start;
      return a;
    },
    async cancel(id) {
      const a = agenda.find((x) => x.id === id)!;
      a.status = "cancelled";
      return a;
    },
    async confirm(id) {
      const a = agenda.find((x) => x.id === id)!;
      a.status = "confirmed";
      return a;
    },
    async upcoming() {
      return agenda.filter((a) => a.customerId === "me" && ["booked", "confirmed"].includes(a.status));
    },
  };
  return { deps, agenda };
}

async function chat(lines: string[], deps: AgentDeps) {
  let state: AgentState = { step: "idle", intent: null };
  const replies: string[] = [];
  for (const line of lines) {
    const r = await respond(line, state, deps);
    state = r.state;
    replies.push(r.reply);
  }
  return { state, replies };
}

test("parses Spanish dates", () => {
  assert.equal(parseDate("mañana", TODAY), "2026-10-23");
  assert.equal(parseDate("pasado mañana en la tarde", TODAY), "2026-10-24");
  assert.equal(parseDate("el lunes", TODAY), "2026-10-26");
  assert.equal(parseDate("el 28 de octubre", TODAY), "2026-10-28");
  assert.equal(parseDate("28/10", TODAY), "2026-10-28");
  assert.equal(parseDate("para el 5", TODAY), "2026-11-05");
  assert.equal(parseDate("hola", TODAY), null);
});

test("parses times and choices", () => {
  assert.equal(parseTime("a las 3"), "15:00");
  assert.equal(parseTime("10 y media de la mañana"), "10:30");
  assert.equal(parseTime("15:30"), "15:30");
  assert.equal(parseTime("4pm"), "16:00");
  assert.equal(parseTime("2"), null);
  assert.equal(parseChoice("la 2"), 2);
  assert.equal(parseChoice("la primera"), 1);
  assert.equal(parseName("me llamo ana maría gómez"), "Ana María Gómez");
  assert.equal(matchService("me duele una muela", DEFAULT_SERVICES)?.id, "svc_urgencia");
  assert.equal(matchService("quiero una limpieza", DEFAULT_SERVICES)?.id, "svc_limpieza");
});

test("availability respects hours, breaks, capacity and notice", () => {
  const service = DEFAULT_SERVICES.find((s) => s.id === "svc_limpieza")!;
  const slots = getSlots({ date: "2026-10-23", service, settings: DEFAULT_SETTINGS, appointments: [], now: NOW });
  assert.ok(slots.length > 0);
  assert.ok(!slots.some((s) => s.time === "12:00" || s.time === "13:00")); // overlaps lunch
  assert.ok(slots.every((s) => s.time >= "08:00" && s.time <= "16:00")); // Friday closes 17:00
  assert.equal(getSlots({ date: "2026-10-25", service, settings: DEFAULT_SETTINGS, appointments: [], now: NOW }).length, 0); // Sunday
  const busy = (id: string): Appointment => ({
    id, serviceId: service.id, customerId: "x", start: localToUtc("2026-10-23", "08:00", -300).toISOString(),
    end: localToUtc("2026-10-23", "09:00", -300).toISOString(), status: "booked", source: "web", notes: "", reminderSentAt: null, createdAt: "",
  });
  const full = getSlots({ date: "2026-10-23", service, settings: DEFAULT_SETTINGS, appointments: [busy("1"), busy("2")], now: NOW });
  assert.ok(!full.some((s) => s.time === "08:00"));
});

test("books an appointment end to end", async () => {
  const { deps, agenda } = fakeDeps();
  const { replies, state } = await chat(["Hola, quiero una limpieza mañana a las 10", "Ana Gómez", "sí"], deps);
  assert.match(replies[0], /a nombre de quién/i);
  assert.match(replies[1], /Ana Gómez/);
  assert.match(replies[2], /agendada/i);
  assert.equal(state.step, "idle");
  assert.equal(agenda.length, 1);
  assert.equal(localParts(agenda[0].start, -300).time, "10:00");
});

test("offers alternatives when the hour is taken and accepts a numbered choice", async () => {
  const { deps, agenda } = fakeDeps([], "Carlos Ruiz");
  const r = await chat(["necesito urgencia mañana a la 1 de la tarde", "1", "si"], deps);
  assert.match(r.replies[0], /no tengo espacio/);
  assert.match(r.replies[2], /agendada/i);
  assert.equal(agenda.length, 1);
});

test("asks for service, then day, then time", async () => {
  const { deps } = fakeDeps([], "Laura");
  const r = await chat(["quiero agendar una cita", "2", "1"], deps);
  assert.match(r.replies[0], /Qué servicio/);
  assert.match(r.replies[1], /Para qué día/);
  assert.match(r.replies[2], /tengo:/);
  assert.equal(r.state.step, "time");
});

test("cancels and reschedules existing appointments", async () => {
  const { deps, agenda } = fakeDeps([], "Laura");
  await chat(["limpieza el lunes a las 9 am", "sí"], deps);
  assert.equal(agenda.length, 1);

  const moved = await chat(["quiero cambiar mi cita", "1", "1", "sí"], deps);
  assert.match(moved.replies.at(-1)!, /quedó para/);

  const cancelled = await chat(["cancelar mi cita", "sí"], deps);
  assert.match(cancelled.replies.at(-1)!, /cancelada/);
  assert.equal(agenda[0].status, "cancelled");
});

test("handles closed days, info questions and handoff", async () => {
  const { deps } = fakeDeps([], "Laura");
  const closed = await chat(["limpieza el domingo"], deps);
  assert.match(closed.replies[0], /no atendemos/);
  assert.match((await chat(["cuál es el horario?"], deps)).replies[0], /Lunes/);
  assert.match((await chat(["cuánto cuesta el blanqueamiento"], deps)).replies[0], /450/);
  const human = await respond("quiero hablar con una persona", { step: "idle", intent: null }, deps);
  assert.equal(human.handoff, true);
});

test("varies its wording but always completes the booking", async () => {
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const { deps, agenda } = fakeDeps();
    const values = [0.1, 0.5, 0.9, 0.3, 0.7].map((v) => (v + i * 0.37) % 1);
    let k = 0;
    deps.random = () => values[k++ % values.length];
    const { replies, state } = await chat(["Hola, quiero una limpieza mañana a las 10", "Ana Gómez", "sí"], deps);
    seen.add(replies[0]);
    assert.equal(state.step, "idle");
    assert.equal(agenda.length, 1, replies.join(" / "));
  }
  assert.ok(seen.size >= 3, `only ${seen.size} phrasings`);
});
