import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettings, listAppointments, listCustomers, listServices, listStaff } from "@/lib/data/store";
import { localParts } from "@/lib/domain/time";
import { CHANNEL_LABEL, STATUS_LABEL } from "@/lib/domain/types";

/** CSV export of the whole agenda for the signed-in business (opens in Excel / Sheets). */
export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const [settings, appointments, customers, services, staff] = await Promise.all([
    getSettings(),
    listAppointments(),
    listCustomers(),
    listServices(),
    listStaff(),
  ]);
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    // Quote, and neutralise spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = [["Fecha", "Hora", "Cliente", "Celular", "Servicio", "Profesional", "Valor", "Estado", "Canal", "Anticipo", "Notas"]];
  for (const a of appointments) {
    const p = localParts(a.start, settings.utcOffsetMinutes);
    const c = customers.find((x) => x.id === a.customerId);
    const s = services.find((x) => x.id === a.serviceId);
    rows.push([
      p.date,
      p.time,
      c?.name ?? "",
      c?.phone?.startsWith("+") ? c.phone : "",
      s?.name ?? "",
      staff.find((x) => x.id === a.staffId)?.name ?? "",
      String(s?.price ?? ""),
      STATUS_LABEL[a.status],
      CHANNEL_LABEL[a.source],
      a.deposit ? `${a.deposit.amount} (${a.deposit.status === "paid" ? "pagado" : a.deposit.status === "waived" ? "exonerado" : "pendiente"})` : "",
      a.notes,
    ]);
  }
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="citas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
