import "server-only";
import { getCustomer, getSettings, listAppointments, listServices, listStaff } from "./data/store";
import { addDays, localParts, localToUtc } from "./domain/time";
import { PAYMENT_LABEL, type PaymentMethod } from "./domain/types";

export interface CashLine {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  price: number;
  amount: number | null;
  method: PaymentMethod | "wompi" | null;
  kind: "visit" | "deposit";
}

/** Everything charged on a range of local days: front-desk payments plus online deposits. */
export async function cashbox(from: string, toExclusive: string) {
  const settings = await getSettings();
  const off = settings.utcOffsetMinutes;
  const start = localToUtc(from, "00:00", off).toISOString();
  const end = localToUtc(toExclusive, "00:00", off).toISOString();
  // Deposits can be paid days before the visit: look a month around the range.
  const [apts, services, staff] = await Promise.all([
    listAppointments({ from: localToUtc(addDays(from, -45), "00:00", off).toISOString(), to: localToUtc(addDays(toExclusive, 60), "00:00", off).toISOString() }),
    listServices(),
    listStaff(),
  ]);
  const svc = new Map(services.map((s) => [s.id, s]));
  const who = new Map(staff.map((s) => [s.id, s.name]));
  const lines: CashLine[] = [];

  for (const a of apts) {
    const customer = (await getCustomer(a.customerId))?.name ?? "Cliente";
    // Paid visits count on the day they were paid; unpaid ones on the day of the visit.
    const when = a.payment?.at ?? a.start;
    if (a.status === "completed" && when >= start && when < end) {
      lines.push({
        id: a.id,
        time: localParts(when, off).time,
        customer,
        service: svc.get(a.serviceId)?.name ?? "Servicio",
        staff: who.get(a.staffId ?? "") ?? "",
        price: svc.get(a.serviceId)?.price ?? 0,
        amount: a.payment?.amount ?? null,
        method: a.payment?.method ?? null,
        kind: "visit",
      });
    }
    if (a.deposit?.status === "paid" && a.deposit.paidAt && a.deposit.paidAt >= start && a.deposit.paidAt < end) {
      lines.push({
        id: `${a.id}:dep`,
        time: localParts(a.deposit.paidAt, off).time,
        customer,
        service: `Anticipo · ${svc.get(a.serviceId)?.name ?? "Servicio"}`,
        staff: "",
        price: a.deposit.amount,
        amount: a.deposit.amount,
        method: "wompi",
        kind: "deposit",
      });
    }
  }
  lines.sort((a, b) => a.time.localeCompare(b.time));

  const byMethod = new Map<string, number>();
  for (const l of lines) if (l.amount !== null && l.method) byMethod.set(l.method, (byMethod.get(l.method) ?? 0) + l.amount);
  const labels: Record<string, string> = { ...PAYMENT_LABEL, wompi: "Wompi (en línea)" };
  return {
    lines,
    total: lines.reduce((s, l) => s + (l.amount ?? 0), 0),
    pending: lines.filter((l) => l.kind === "visit" && l.amount === null).length,
    byMethod: [...byMethod.entries()].map(([m, v]) => ({ method: m, label: labels[m] ?? m, amount: v })).sort((a, b) => b.amount - a.amount),
    today: localParts(new Date(), off).date,
  };
}
