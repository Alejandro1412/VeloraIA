import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { getSettings, listAppointments, listCustomers, listServices, listStaff } from "@/lib/data/store";
import { localParts } from "@/lib/domain/time";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { CustomersTable, type CustomerRow } from "@/components/app/CustomersTable";

const HELP = {
  "id": "clientes",
  "steps": [
    {
      "title": "Se crean solos",
      "body": "Cada persona que agenda queda guardada con su historial."
    },
    {
      "title": "Filtra rápido",
      "body": "Con cita próxima o quienes han faltado."
    },
    {
      "title": "Anota detalles",
      "body": "Toca un cliente para ver sus citas y escribir notas."
    },
    {
      "title": "Descarga",
      "body": "Exporta todas las citas a Excel cuando quieras."
    }
  ]
};

export default function CustomersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Customers />
    </Suspense>
  );
}

async function Customers() {
  await requireSession();
  const [settings, customers, appointments, services, staff] = await Promise.all([
    getSettings(),
    listCustomers(),
    listAppointments(),
    listServices(),
    listStaff(),
  ]);
  const now = new Date().toISOString();
  const rows: CustomerRow[] = customers
    .filter((c) => !c.phone.startsWith("web_") || appointments.some((a) => a.customerId === c.id))
    .map((c) => {
      const mine = appointments.filter((a) => a.customerId === c.id).sort((a, b) => b.start.localeCompare(a.start));
      const attended = mine.filter((a) => a.status === "completed");
      const next = [...mine].reverse().find((a) => a.start >= now && (a.status === "booked" || a.status === "confirmed"));
      const last = attended[0];
      return {
        id: c.id,
        name: c.name || "Sin nombre",
        phone: c.phone.startsWith("+") ? c.phone : "",
        notes: c.notes ?? "",
        visits: attended.length,
        noShows: mine.filter((a) => a.status === "no_show").length,
        cancellations: mine.filter((a) => a.status === "cancelled").length,
        spent: attended.reduce((sum, a) => sum + (services.find((s) => s.id === a.serviceId)?.price ?? 0), 0),
        lastVisit: last ? localParts(last.start, settings.utcOffsetMinutes).date : null,
        nextVisit: next ? localParts(next.start, settings.utcOffsetMinutes).date : null,
        history: mine.slice(0, 20).map((a) => {
          const p = localParts(a.start, settings.utcOffsetMinutes);
          return {
            id: a.id,
            date: p.date,
            time: p.time,
            service: services.find((s) => s.id === a.serviceId)?.name ?? "Servicio",
            staff: staff.find((s) => s.id === a.staffId)?.name ?? "",
            status: a.status,
          };
        }),
      };
    })
    .sort((a, b) => (b.nextVisit ?? b.lastVisit ?? "").localeCompare(a.nextVisit ?? a.lastVisit ?? ""));

  return (
    <>
      <PageHeader help={HELP}
        title="Clientes"
        description={`${rows.length} clientes. Historial, inasistencias y notas de cada uno.`}
        actions={
          <a href="/api/export/citas" className="btn-ghost btn-sm">
            Descargar citas (Excel)
          </a>
        }
      />
      <CustomersTable rows={rows} currency={settings.currency} />
    </>
  );
}
