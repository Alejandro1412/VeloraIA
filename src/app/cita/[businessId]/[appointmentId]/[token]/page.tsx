import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBusiness } from "@/lib/accounts";
import { getAppointment, getService, getSettings, listStaff } from "@/lib/data/store";
import { addDays, formatDateEs, formatTimeEs, localParts } from "@/lib/domain/time";
import { verifyLink } from "@/lib/links";
import { DEMO_BUSINESS_ID, isValidBusinessId, withBusiness } from "@/lib/tenant";
import { ManageAppointment } from "./ManageAppointment";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Tu cita", robots: { index: false } };

type Params = PageProps<"/cita/[businessId]/[appointmentId]/[token]">["params"];

export default function AppointmentPage({ params }: { params: Params }) {
  return (
    <main className="min-h-dvh px-5 py-8">
      <Suspense fallback={<div className="shimmer mx-auto h-96 max-w-lg rounded-[28px]" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: Params }) {
  const { businessId, appointmentId, token } = await params;
  if (!isValidBusinessId(businessId) || !verifyLink("cita", businessId, appointmentId, token)) notFound();
  if (businessId !== DEMO_BUSINESS_ID && !(await getBusiness(businessId))) notFound();

  const data = await withBusiness(businessId, async () => {
    const apt = await getAppointment(appointmentId);
    if (!apt) return null;
    const [settings, service, staff] = await Promise.all([getSettings(), getService(apt.serviceId), listStaff()]);
    return { apt, settings, service, staffName: staff.find((s) => s.id === apt.staffId)?.name };
  });
  if (!data) notFound();
  const { apt, settings, service, staffName } = data;
  const p = localParts(apt.start, settings.utcOffsetMinutes);
  const today = localParts(new Date(), settings.utcOffsetMinutes).date;
  const past = new Date(apt.start) < new Date();

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-muted">
          <LogoMark className="size-5" /> {settings.name}
        </p>
        <ThemeToggle />
      </div>
      <section className="mt-6 animate-[rise_800ms_var(--ease-out-expo)_both] overflow-hidden rounded-[28px] border border-line bg-paper shadow-[0_40px_90px_-50px_rgba(14,27,61,.55)]">
        <div className="bg-gradient-to-br from-cobalt to-[#5b3cff] px-6 pt-6 pb-8 text-white">
          <p className="text-sm text-white/75">Tu cita</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight first-letter:uppercase">{formatDateEs(p.date)}</h1>
          <p className="mt-1 text-xl">{formatTimeEs(p.time)}</p>
        </div>
        <dl className="grid grid-cols-[110px_1fr] gap-y-3 px-6 py-5 text-[15px]">
          <dt className="text-muted">Servicio</dt>
          <dd>{service?.name ?? "Servicio"}</dd>
          {staffName && (
            <>
              <dt className="text-muted">Con</dt>
              <dd>{staffName}</dd>
            </>
          )}
          {apt.seriesTotal && apt.seriesTotal > 1 && (
            <>
              <dt className="text-muted">Sesión</dt>
              <dd>
                {apt.seriesIndex} de {apt.seriesTotal}
              </dd>
            </>
          )}
          {settings.address && (
            <>
              <dt className="text-muted">Dónde</dt>
              <dd>
                {settings.address}
                {settings.mapsUrl && (
                  <a href={settings.mapsUrl} className="ml-2 text-cobalt hover:underline">
                    Cómo llegar
                  </a>
                )}
              </dd>
            </>
          )}
        </dl>
        <ManageAppointment
          refs={{ businessId, appointmentId, token }}
          status={apt.status}
          past={past}
          today={today}
          maxDate={addDays(today, settings.maxDaysAhead)}
          initialDate={p.date >= today ? p.date : today}
          phone={settings.phone}
        />
      </section>
      <p className="mt-6 text-center text-xs text-muted">Reservas con Velora · Este enlace es personal, no lo compartas.</p>
    </div>
  );
}
