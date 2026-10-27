import { appointmentLink, surveyLink } from "@/lib/links";
import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { loadContext } from "@/lib/dashboard";
import { listAppointments, listStaff } from "@/lib/data/store";
import { addDays, formatDateEs, MONTHS_ES, toMinutes, weekdayOf } from "@/lib/domain/time";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { AgendaBoard, type BoardAppointment } from "@/components/app/AgendaBoard";

const HELP = {
  "id": "agenda",
  "steps": [
    {
      "title": "Navega por semanas",
      "body": "Usa Anterior, Hoy y Siguiente para moverte."
    },
    {
      "title": "Toca una cita",
      "body": "Confírmala, márcala atendida, muévela o cámbiale el profesional."
    },
    {
      "title": "Filtra por persona",
      "body": "Con profesionales, toca un nombre para ver solo su agenda."
    },
    {
      "title": "Agenda a mano",
      "body": "“Nueva cita” para quien llama o llega al mostrador."
    }
  ]
};

export default function AgendaPage({ searchParams }: PageProps<"/app/agenda">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Agenda searchParams={searchParams} />
    </Suspense>
  );
}

const mondayOf = (date: string) => addDays(date, -((weekdayOf(date) + 6) % 7));

async function Agenda({ searchParams }: { searchParams: PageProps<"/app/agenda">["searchParams"] }) {
  const session = await requireSession();
  const params = await searchParams;
  const ctx = await loadContext();
  const requested = typeof params.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : ctx.today;
  const monday = mondayOf(requested);

  const [raw, staff] = await Promise.all([listAppointments({ from: ctx.dayStart(monday), to: ctx.dayStart(addDays(monday, 7)) }), listStaff()]);
  const appointments: BoardAppointment[] = raw.map(ctx.enrich).map((a) => ({
    id: a.id,
    date: a.localDate,
    start: a.localTime,
    end: a.localEnd,
    status: a.status,
    source: a.source,
    notes: a.notes,
    serviceId: a.serviceId,
    serviceName: a.service?.name ?? "Servicio eliminado",
    price: a.service?.price ?? 0,
    customerName: a.customer?.name ?? "Cliente",
    customerPhone: a.customer?.phone ?? "",
    staffId: a.staffId,
    deposit: a.deposit ? { amount: a.deposit.amount, status: a.deposit.status } : undefined,
    series: a.seriesId && a.seriesTotal ? { id: a.seriesId, index: a.seriesIndex ?? 1, total: a.seriesTotal } : undefined,
    rating: a.rating,
    manageUrl: appointmentLink(session.businessId, a.id),
    surveyUrl: surveyLink(session.businessId, a.id),
  }));

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (d) => ctx.settings.hours[weekdayOf(d)] || appointments.some((a) => a.date === d),
  );
  const open = ctx.settings.hours.filter(Boolean).map((h) => toMinutes(h!.open));
  const close = ctx.settings.hours.filter(Boolean).map((h) => toMinutes(h!.close));
  const startHour = Math.floor(Math.min(...open, ...appointments.map((a) => toMinutes(a.start)), 8 * 60) / 60);
  const endHour = Math.ceil(Math.max(...close, ...appointments.map((a) => toMinutes(a.end)), 17 * 60) / 60);

  const [, m1, d1] = monday.split("-").map(Number);
  const sunday = addDays(monday, 6);
  const [, m2, d2] = sunday.split("-").map(Number);
  const range = m1 === m2 ? `${d1} al ${d2} de ${MONTHS_ES[m1 - 1]}` : `${d1} de ${MONTHS_ES[m1 - 1]} al ${d2} de ${MONTHS_ES[m2 - 1]}`;
  const weekTotal = appointments.filter((a) => a.status === "booked" || a.status === "confirmed").length;

  return (
    <>
      <PageHeader help={HELP}
        title="Agenda"
        description={`Semana del ${range} · ${weekTotal} citas activas`}
        actions={
          <>
            <Link href={`/app/agenda?week=${addDays(monday, -7)}`} className="btn-ghost btn-sm" aria-label="Semana anterior">
              Anterior
            </Link>
            <Link href="/app/agenda" className="btn-ghost btn-sm">
              Hoy
            </Link>
            <Link href={`/app/agenda?week=${addDays(monday, 7)}`} className="btn-ghost btn-sm" aria-label="Semana siguiente">
              Siguiente
            </Link>
          </>
        }
      />
      <AgendaBoard
        key={monday}
        days={days.map((d) => ({ date: d, label: formatDateEs(d), isToday: d === ctx.today }))}
        appointments={appointments}
        startHour={startHour}
        endHour={endHour}
        services={ctx.services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, sessions: s.sessions ?? 1 }))}
        today={ctx.today}
        openNew={params.new === "1"}
        staff={staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, color: s.color, serviceIds: s.serviceIds }))}
      />
    </>
  );
}
