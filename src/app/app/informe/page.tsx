import Link from "next/link";
import { Suspense } from "react";
import { clsx } from "clsx";
import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/data/store";
import { localParts } from "@/lib/domain/time";
import { monthReport, shiftMonth } from "@/lib/report";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { CountUp } from "@/components/fx/CountUp";
import { PrintButton } from "@/components/app/PrintButton";

const HELP = {
  id: "informe",
  steps: [
    { title: "Tu mes en números", body: "Citas, ingresos, inasistencias y clientes nuevos." },
    { title: "Lo que hizo tu recepcionista", body: "Cuántas citas agendó sola y cuántas llegaron fuera de horario." },
    { title: "Compara", body: "Las flechas muestran si mejoraste frente al mes anterior." },
    { title: "Compártelo", body: "“Descargar PDF” lo guarda o imprime. También te llega al correo el día 1." },
  ],
};

export default function ReportPage({ searchParams }: PageProps<"/app/informe">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Report searchParams={searchParams} />
    </Suspense>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Delta({ now, before, invert = false, format = (n: number) => String(n) }: { now: number; before?: number; invert?: boolean; format?: (n: number) => string }) {
  if (before === undefined) return null;
  const diff = now - before;
  if (Math.abs(diff) < 1e-9) return <span className="text-xs text-muted">igual que el mes anterior</span>;
  const good = invert ? diff < 0 : diff > 0;
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", good ? "bg-mint-soft text-mint-ink" : "bg-rose-soft text-rose-ink")}>
      {diff > 0 ? "▲" : "▼"} {format(Math.abs(diff))} vs. mes anterior
    </span>
  );
}

async function Report({ searchParams }: { searchParams: PageProps<"/app/informe">["searchParams"] }) {
  await requireOwner();
  const [settings, query] = await Promise.all([getSettings(), searchParams]);
  const current = localParts(new Date(), settings.utcOffsetMinutes).date.slice(0, 7);
  const month = typeof query.mes === "string" && /^\d{4}-\d{2}$/.test(query.mes) && query.mes <= current ? query.mes : current;
  const r = await monthReport(month);
  const maxWeek = Math.max(1, ...r.byWeek.map((w) => w.count));
  const maxService = Math.max(1, ...r.byService.map((s) => s.count));
  const automatedShare = r.total ? r.automated / r.total : 0;

  return (
    <>
      <PageHeader
        help={HELP}
        title="Informe mensual"
        description={`${settings.name} · ${r.label}${month === current ? " (en curso)" : ""}`}
        actions={
          <>
            <Link href={`/app/informe?mes=${shiftMonth(month, -1)}`} className="btn-ghost btn-sm print:hidden">
              ← Mes anterior
            </Link>
            {month < current && (
              <Link href={`/app/informe?mes=${shiftMonth(month, 1)}`} className="btn-ghost btn-sm print:hidden">
                Mes siguiente →
              </Link>
            )}
            <PrintButton />
          </>
        }
      />

      <div className="space-y-10 px-5 py-8 lg:px-10">
        {/* hero statement */}
        <section className="relative animate-[rise_800ms_var(--ease-out-expo)_both] overflow-hidden rounded-[28px] bg-night p-7 text-white sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-cobalt/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-mint/25 blur-3xl" />
          <p className="relative text-sm text-white/70">En {r.label}</p>
          {r.automated === 0 ? (
            <p className="relative mt-2 max-w-3xl font-display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
              Comparte tu enlace y conecta tu WhatsApp: aquí verás todo lo que {settings.assistantName} agenda por ti.
            </p>
          ) : (
            <>
          <p className="relative mt-2 max-w-3xl font-display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
            {settings.assistantName} agendó{" "}
            <span className="text-[#9fb2ff]">
              <CountUp value={String(r.automated)} /> citas
            </span>{" "}
            sin que tu equipo moviera un dedo
            {r.afterHours > 0 && (
              <>
                , y <span className="text-[#7ff0cc]">{r.afterHours}</span> llegaron con el negocio cerrado
              </>
            )}
            .
          </p>
          <p className="relative mt-4 max-w-2xl text-white/75">
            Eso es {pct(automatedShare)} de tu agenda del mes
            {r.automatedRevenue > 0 && <> y {money(r.automatedRevenue)} en servicios atendidos que llegaron por ella</>}.
          </p>
            </>
          )}
        </section>

        {/* KPIs */}
        <dl className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[
            { label: "Citas del mes", value: String(r.total), delta: <Delta now={r.total} before={r.previous?.total} /> },
            { label: "Ingresos atendidos", value: money(r.revenue), delta: <Delta now={r.revenue} before={r.previous?.revenue} format={money} /> },
            {
              label: "Inasistencia",
              value: pct(r.noShowRate),
              delta: <Delta now={r.noShowRate} before={r.previous?.noShowRate} invert format={pct} />,
            },
            { label: "Clientes nuevos", value: String(r.newCustomers), delta: <span className="text-xs text-muted">primera cita este mes</span> },
            { label: "Conversaciones", value: String(r.conversations), delta: <span className="text-xs text-muted">WhatsApp, web y voz</span> },
            { label: "Confirmaron tras el recordatorio", value: pct(r.confirmedRate), delta: <span className="text-xs text-muted">de las citas recordadas</span> },
            {
              label: "Calificación",
              value: r.rating.count ? `${r.rating.average.toFixed(1)} ★` : "—",
              delta: <span className="text-xs text-muted">{r.rating.count} {r.rating.count === 1 ? "opinión" : "opiniones"}</span>,
            },
            { label: "Hora más pedida", value: r.busiestHour ?? "—", delta: <span className="text-xs text-muted">para reforzar tu equipo</span> },
          ].map((k) => (
            <div key={k.label} className="spotlight rounded-2xl border border-line bg-paper p-4 sm:p-5">
              <dt className="text-sm text-muted">{k.label}</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold tracking-[-0.03em]">
                <CountUp value={k.value} />
              </dd>
              <dd className="mt-2">{k.delta}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-8 xl:grid-cols-2">
          <section aria-labelledby="weeks-title" className="spotlight rounded-2xl border border-line bg-paper p-5">
            <h2 id="weeks-title" className="font-display text-xl font-semibold tracking-tight">
              Citas por semana
            </h2>
            <div className="mt-5 flex h-48 items-end gap-3">
              {r.byWeek.map((w, i) => (
                <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="tabular text-sm font-medium">{w.count}</span>
                  <div
                    className="w-full origin-bottom animate-[grow-y_900ms_var(--ease-out-expo)_both] rounded-lg bg-gradient-to-t from-cobalt to-[#8fa2ff]"
                    style={{ height: `${Math.max(3, (w.count / maxWeek) * 100)}%`, animationDelay: `${i * 90}ms` }}
                  />
                  <span className="text-xs text-muted">{w.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="svc-title" className="spotlight rounded-2xl border border-line bg-paper p-5">
            <h2 id="svc-title" className="font-display text-xl font-semibold tracking-tight">
              Servicios más pedidos
            </h2>
            {r.byService.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Aún no hay citas este mes.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {r.byService.map((s, i) => (
                  <li key={s.name}>
                    <div className="flex items-baseline justify-between gap-3 text-[15px]">
                      <span className="truncate">{s.name}</span>
                      <span className="tabular shrink-0 text-ink-2">
                        {s.count} · {money(s.revenue)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line-soft">
                      <div
                        className="h-full origin-left animate-[grow-x_1000ms_var(--ease-out-expo)_both] rounded-full bg-gradient-to-r from-cobalt to-mint"
                        style={{ width: `${(s.count / maxService) * 100}%`, animationDelay: `${i * 80}ms` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {r.byStaff.length > 0 && (
          <section aria-labelledby="staff-title" className="spotlight rounded-2xl border border-line bg-paper p-5">
            <h2 id="staff-title" className="font-display text-xl font-semibold tracking-tight">
              Citas por profesional
            </h2>
            <ul className="stagger mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {r.byStaff.map((s) => (
                <li key={s.name} className="flex items-center gap-3 rounded-xl bg-porcelain/60 px-4 py-3">
                  <span className="size-3 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="tabular font-semibold">{s.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-sm text-muted">
          Atendidas: {r.completed} · No asistieron: {r.noShows} · Canceladas: {r.cancelled}. Los ingresos cuentan solo citas marcadas como atendidas, con el
          precio actual de cada servicio.
        </p>
      </div>
    </>
  );
}
