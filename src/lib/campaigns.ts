import "server-only";
import { listAppointments, listCustomers } from "./data/store";

export interface Audience {
  customerId: string;
  name: string;
  phone: string;
  lastVisit: string;
  lastService: string;
}

/**
 * Customers whose last visit is older than `months` and who have nothing
 * booked ahead. Optionally only those whose last visit was a given service.
 */
export async function inactiveCustomers(months: number, serviceId: string | undefined, serviceNames: Map<string, string>, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const [customers, appointments] = await Promise.all([listCustomers(), listAppointments()]);
  const out: Audience[] = [];
  for (const c of customers) {
    if (!/^\+\d{8,15}$/.test(c.phone)) continue;
    const mine = appointments.filter((a) => a.customerId === c.id && a.status !== "cancelled").sort((a, b) => b.start.localeCompare(a.start));
    if (!mine.length) continue;
    if (mine.some((a) => new Date(a.start) >= now)) continue;
    const last = mine.find((a) => a.status === "completed") ?? mine[0];
    if (new Date(last.start) > cutoff) continue;
    if (serviceId && last.serviceId !== serviceId) continue;
    out.push({ customerId: c.id, name: c.name, phone: c.phone, lastVisit: last.start, lastService: serviceNames.get(last.serviceId) ?? "Servicio" });
  }
  return out.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}

export const fillMessage = (template: string, v: { name: string; business: string; link: string; service: string }) =>
  template
    .replaceAll("{nombre}", v.name.split(" ")[0] || "")
    .replaceAll("{negocio}", v.business)
    .replaceAll("{enlace}", v.link)
    .replaceAll("{servicio}", v.service.toLowerCase());
