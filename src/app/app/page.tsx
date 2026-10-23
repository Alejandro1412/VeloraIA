import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { getOverview } from "@/lib/dashboard";
import { formatDateEs, formatMoney, formatTimeEs, WEEKDAYS_ES } from "@/lib/domain/time";
import { CHANNEL_LABEL } from "@/lib/domain/types";
import { ChannelTag, Empty, PageHeader, PageSkeleton, StatusBadge } from "@/components/app/ui";

export default function OverviewPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview />
    </Suspense>
  );
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

async function Overview() {
  await requireSession();
  const o = await getOverview();
  const max = Math.max(1, ...o.perDay.map((d) => d.count));
  const channelTotal = o.byChannel.reduce((s, [, n]) => s + n, 0) || 1;

  return (
    <>
      <PageHeader
        title={o.settings.name}
        description={`${formatDateEs(o.today).replace(/^./, (c) => c.toUpperCase())}. Así va tu recepción.`}
        actions={
          <>
            <Link href="/app/agenda?new=1" className="btn-primary btn-sm">
              Nueva cita
            </Link>
            <Link href="/#demo" className="btn-ghost btn-sm">
              Probar el chat
            </Link>
          </>
        }
      />

      <div className="px-5 py-8 lg:px-10">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-line pb-8 md:grid-cols-4">
          {[
            { label: "Citas hoy", value: String(o.stats.todayCount), hint: "agendadas y confirmadas" },
            { label: "Próximos 7 días", value: String(o.stats.next7Count), hint: `${formatMoney(o.stats.revenue7)} en servicios` },
            {
              label: "Confirmadas (48 h)",
              value: o.stats.soonCount ? pct(o.stats.confirmedRate) : "—",
              hint: `de ${o.stats.soonCount} citas próximas`,
            },
            { label: "Inasistencia (30 días)", value: pct(o.stats.noShowRate), hint: "sobre citas atendidas", tone: o.stats.noShowRate > 0.12 ? "text-rose" : "" },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className={`tabular mt-1 font-display text-4xl font-semibold tracking-[-0.03em] ${s.tone ?? ""}`}>{s.value}</dd>
              <dd className="mt-1 text-sm text-ink-2">{s.hint}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid gap-10 xl:grid-cols-[1.35fr_1fr]">
          <section aria-labelledby="today-title" className="min-w-0">
            <div className="flex items-baseline justify-between">
              <h2 id="today-title" className="font-display text-xl font-semibold tracking-tight">
                Agenda de hoy
              </h2>
              <Link href="/app/agenda" className="text-sm text-cobalt hover:underline">
                Ver semana
              </Link>
            </div>
            <ol className="mt-4 divide-y divide-line-soft rounded-2xl border border-line bg-paper">
              {o.todays.length === 0 && (
                <li className="p-4">
                  <Empty title="Hoy no hay citas">Cuando Sofía agende, aparecerán aquí en tiempo real.</Empty>
                </li>
              )}
              {o.todays.map((a) => (
                <li key={a.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-4 px-4 py-3.5">
                  <span className="tabular text-[15px] font-medium">{formatTimeEs(a.localTime)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.customer?.name ?? "Cliente"}</p>
                    <p className="truncate text-sm text-muted">
                      {a.service?.name ?? "Servicio"} · <ChannelTag channel={a.source} />
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ol>
          </section>

          <div className="min-w-0 space-y-10">
            <section aria-labelledby="week-title">
              <h2 id="week-title" className="font-display text-xl font-semibold tracking-tight">
                Citas por día
              </h2>
              <div className="mt-4 flex h-40 items-end gap-2 rounded-2xl border border-line bg-paper p-4" role="img" aria-label={o.perDay.map((d) => `${d.date}: ${d.count} citas`).join(", ")}>
                {o.perDay.map((d, i) => (
                  <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="tabular text-xs text-ink-2">{d.count || ""}</span>
                    <div className={`w-full rounded-md ${i === 0 ? "bg-cobalt" : "bg-ink/80"}`} style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} />
                    <span className="text-xs text-muted">{i === 0 ? "Hoy" : WEEKDAYS_ES[new Date(`${d.date}T12:00:00Z`).getUTCDay()].slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="channel-title">
              <h2 id="channel-title" className="font-display text-xl font-semibold tracking-tight">
                De dónde llegan las citas
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                {pct(o.stats.automatedShare)} las agendó Velora sin intervención de tu equipo.
              </p>
              <ul className="mt-4 space-y-3">
                {o.byChannel.map(([channel, n]) => (
                  <li key={channel} className="grid grid-cols-[96px_1fr_40px] items-center gap-3 text-sm">
                    <span className="text-ink-2">{CHANNEL_LABEL[channel]}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-line-soft">
                      <span className={`block h-full rounded-full ${channel === "manual" ? "bg-muted" : "bg-cobalt"}`} style={{ width: `${(n / channelTotal) * 100}%` }} />
                    </span>
                    <span className="tabular text-right">{n}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="att-title">
              <div className="flex items-baseline justify-between">
                <h2 id="att-title" className="font-display text-xl font-semibold tracking-tight">
                  Conversaciones recientes
                </h2>
                <Link href="/app/conversaciones" className="text-sm text-cobalt hover:underline">
                  Ver todas
                </Link>
              </div>
              <ul className="mt-4 divide-y divide-line-soft rounded-2xl border border-line bg-paper">
                {o.recentConversations.length === 0 && <li className="p-4 text-sm text-muted">Aún no hay conversaciones.</li>}
                {o.recentConversations.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/conversaciones?c=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-porcelain/60">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-porcelain text-sm font-semibold">
                        {(c.customerName || "?")[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{c.customerName || "Visitante web"}</span>
                          {c.humanTakeover && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] text-[#8a5a12]">Requiere al equipo</span>}
                        </span>
                        <span className="block truncate text-sm text-muted">{c.lastMessage}</span>
                      </span>
                      {c.unread > 0 && <span className="size-2.5 rounded-full bg-cobalt" aria-label="Sin leer" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
