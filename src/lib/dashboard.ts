import "server-only";
import { addDays, localParts, localToUtc } from "./domain/time";
import type { Appointment, Channel, Customer, Service } from "./domain/types";
import { getSettings, listAppointments, listConversations, listCustomers, listServices } from "./data/store";

export interface EnrichedAppointment extends Appointment {
  service?: Service;
  customer?: Customer;
  localDate: string;
  localTime: string;
  localEnd: string;
}

export async function loadContext() {
  const [settings, services, customers] = await Promise.all([getSettings(), listServices(), listCustomers()]);
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const enrich = (a: Appointment): EnrichedAppointment => {
    const p = localParts(a.start, settings.utcOffsetMinutes);
    return {
      ...a,
      service: serviceMap.get(a.serviceId),
      customer: customerMap.get(a.customerId),
      localDate: p.date,
      localTime: p.time,
      localEnd: localParts(a.end, settings.utcOffsetMinutes).time,
    };
  };
  const today = localParts(new Date(), settings.utcOffsetMinutes).date;
  const dayStart = (d: string) => localToUtc(d, "00:00", settings.utcOffsetMinutes).toISOString();
  return { settings, services, customers, enrich, today, dayStart };
}

export async function getOverview() {
  const ctx = await loadContext();
  const { today, dayStart, enrich } = ctx;
  const now = new Date();

  const [past, upcoming, conversations] = await Promise.all([
    listAppointments({ from: dayStart(addDays(today, -30)), to: dayStart(today) }),
    listAppointments({ from: dayStart(today), to: dayStart(addDays(today, 7)) }),
    listConversations(50),
  ]);

  const active = (a: Appointment) => a.status === "booked" || a.status === "confirmed";
  const todays = upcoming.filter((a) => localParts(a.start, ctx.settings.utcOffsetMinutes).date === today).map(enrich);
  const next7 = upcoming.filter(active);

  const attended = past.filter((a) => a.status === "completed").length;
  const noShows = past.filter((a) => a.status === "no_show").length;
  const noShowRate = attended + noShows ? noShows / (attended + noShows) : 0;

  const soon = upcoming.filter((a) => active(a) && new Date(a.start).getTime() - now.getTime() < 48 * 3_600_000);
  const confirmedRate = soon.length ? soon.filter((a) => a.status === "confirmed").length / soon.length : 0;

  const byChannel = new Map<Channel, number>();
  for (const a of [...past, ...upcoming]) byChannel.set(a.source, (byChannel.get(a.source) ?? 0) + 1);
  const automated = [...byChannel.entries()].filter(([c]) => c !== "manual").reduce((s, [, n]) => s + n, 0);
  const totalBooked = [...byChannel.values()].reduce((s, n) => s + n, 0);

  const perDay = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      count: next7.filter((a) => localParts(a.start, ctx.settings.utcOffsetMinutes).date === date).length,
    };
  });

  const revenue7 = next7.reduce((s, a) => s + (ctx.services.find((x) => x.id === a.serviceId)?.price ?? 0), 0);

  const needsAttention = conversations.filter((c) => c.humanTakeover || c.unread > 0).slice(0, 5);

  return {
    ...ctx,
    todays: todays.sort((a, b) => a.start.localeCompare(b.start)),
    stats: {
      todayCount: todays.filter((a) => active(a)).length,
      next7Count: next7.length,
      noShowRate,
      confirmedRate,
      soonCount: soon.length,
      automatedShare: totalBooked ? automated / totalBooked : 0,
      revenue7,
    },
    byChannel: [...byChannel.entries()].sort((a, b) => b[1] - a[1]),
    perDay,
    needsAttention,
    recentConversations: conversations.slice(0, 5),
  };
}
