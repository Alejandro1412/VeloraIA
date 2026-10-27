import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { cashbox } from "@/lib/cashbox";
import { addDays } from "@/lib/domain/time";
import { PAYMENT_LABEL } from "@/lib/domain/types";

/** CSV of one day's cash register (for the accountant). */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const day = req.nextUrl.searchParams.get("fecha") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return new NextResponse("Fecha inválida", { status: 400 });
  const c = await cashbox(day, addDays(day, 1));
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = [["Fecha", "Hora", "Cliente", "Concepto", "Profesional", "Precio", "Pagado", "Medio"]];
  for (const l of c.lines) {
    rows.push([day, l.time, l.customer, l.service, l.staff, String(l.price), l.amount === null ? "" : String(l.amount), l.method === "wompi" ? "Wompi" : l.method ? PAYMENT_LABEL[l.method] : "Sin registrar"]);
  }
  rows.push([], ["", "", "", "", "", "Total", String(c.total), ""]);
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="caja-${day}.csv"` },
  });
}
