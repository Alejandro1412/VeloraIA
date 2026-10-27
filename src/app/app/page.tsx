import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { getOverview } from "@/lib/dashboard";
import { formatDateEs, formatMoney, formatTimeEs, WEEKDAYS_ES } from "@/lib/domain/time";
import { CHANNEL_LABEL } from "@/lib/domain/types";
import { ChannelTag, Empty, PageHeader, PageSkeleton, StatusBadge } from "@/components/app/ui";
import { CountUp } from "@/components/fx/CountUp";
import { getSettings, listAppointments, listConversations, listStaff } from "@/lib/data/store";

const HELP = {
  "id": "resumen",
  "steps": [
    {
      "title": "Mira tu día",
      "body": "Citas de hoy, de la semana y cuántas ya confirmaron."
    },
    {
      "title": "Prueba a tu recepcionista",
      "body": "Usa “Probar” para escribirle como si fueras un cliente."
    },
    {
      "title": "Revisa lo pendiente",
      "body": "Los chats que piden una persona aparecen marcados."
    },
    {
      "title": "Comparte tu enlace",
      "body": "En Ajustes está tu enlace de reservas para Instagram o Google."
    }
  ]
};

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
      <PageHeader help={HELP} back={false}
        title={o.settings.name}
        description={`${formatDateEs(o.today).replace(/^./, (c) => c.toUpperCase())}. Así va tu recepción.`}
        actions={
          <>
            <Link href="/app/agenda?new=1" className="btn-primary btn-sm">
              Nueva cita
            </Link>
            <Link href="/app/probar" className="btn-ghost btn-sm">
              Probar a {o.settings.assistantName}
            </Link>
          </>
        }
      />

      <div className="px-5 py-8 lg:px-10">
        <Suspense fallback={null}>
          <GettingStarted />
        </Suspense>
        <dl className="stagger grid grid-cols-2 gap-3 border-b border-line pb-8 md:grid-cols-4 md:gap-4">
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
            <div key={s.label} className="spotlight rounded-2xl border border-line bg-paper p-4 sm:p-5">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className={`tabular mt-1 font-display text-4xl font-semibold tracking-[-0.03em] ${s.tone ?? ""}`}>
                <CountUp value={s.value} />
              </dd>
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
            <ol className="stagger mt-4 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-paper">
              {o.todays.length === 0 && (
                <li className="p-4">
                  <Empty title="Hoy no hay citas">Cuando Sofía agende, aparecerán aquí en tiempo real.</Empty>
                </li>
              )}
              {o.todays.map((a) => (
                <li key={a.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-porcelain/60">
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
                    <div
                      className={`w-full origin-bottom animate-[grow-y_900ms_var(--ease-out-expo)_both] rounded-md transition-[filter] hover:brightness-125 ${i === 0 ? "bg-gradient-to-t from-cobalt to-[#7d93ff]" : "bg-night/80"}`}
                      style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, animationDelay: `${i * 70}ms` }}
                      data-tip={`${d.count} ${d.count === 1 ? "cita" : "citas"}`}
                    />
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
                      <span
                        className={`block h-full origin-left animate-[grow-x_1100ms_var(--ease-out-expo)_both] rounded-full ${channel === "manual" ? "bg-muted" : "bg-gradient-to-r from-cobalt to-mint"}`}
                        style={{ width: `${(n / channelTotal) * 100}%` }}
                      />
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
              <ul className="stagger mt-4 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-paper">
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
                          {c.humanTakeover && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] text-amber-ink">Requiere al equipo</span>}
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

/* ------------------------------ getting started ----------------------------- */

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function GettingStarted() {
  const session = await requireSession();
  if (session.demo || session.role !== "owner") return null;
  const [settings, staff, conversations, appointments] = await Promise.all([
    getSettings(),
    listStaff(),
    listConversations(50),
    listAppointments({ from: daysAgo(90) }),
  ]);
  const steps = [
    { done: !!settings.address && !!settings.phone, title: "Completa tu negocio", body: "Dirección y teléfono para que tu recepcionista los comparta.", href: "/app/ajustes" },
    { done: staff.length > 0, title: "Agrega a tu equipo", body: "Quién atiende y qué servicios hace.", href: "/app/profesionales" },
    { done: conversations.some((c) => c.channel === "web"), title: `Prueba a ${settings.assistantName}`, body: "Escríbele como si fueras un cliente.", href: "/app/probar" },
    { done: appointments.some((a) => a.source !== "manual"), title: "Recibe tu primera reserva", body: "Comparte tu enlace en Instagram, Google o WhatsApp.", href: "/app/ajustes" },
    { done: !!settings.notifyEmail || !!settings.notifyWhatsapp, title: "Activa tus avisos", body: "Te avisamos de citas nuevas y cancelaciones.", href: "/app/ajustes" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const pctDone = done / steps.length;
  const C = 2 * Math.PI * 22;

  return (
    <section aria-labelledby="start-title" className="mb-8 animate-[rise_800ms_var(--ease-out-expo)_both] overflow-hidden rounded-[24px] border border-line bg-paper">
      <div className="flex items-center gap-4 border-b border-line-soft bg-gradient-to-r from-cobalt-soft/70 via-paper to-mint-soft/60 px-5 py-4">
        <svg viewBox="0 0 52 52" className="size-14 shrink-0 -rotate-90" aria-hidden>
          <circle cx="26" cy="26" r="22" fill="none" stroke="var(--color-line-soft)" strokeWidth="6" />
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            stroke="url(#start-grad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pctDone)}
            className="animate-[ring_1200ms_var(--ease-out-expo)_both]"
            style={{ ["--ring-from" as string]: C }}
          />
          <defs>
            <linearGradient id="start-grad" x1="0" x2="1">
              <stop offset="0" stopColor="var(--color-cobalt)" />
              <stop offset="1" stopColor="var(--color-mint)" />
            </linearGradient>
          </defs>
        </svg>
        <div>
          <h2 id="start-title" className="font-display text-xl font-semibold tracking-tight">
            Primeros pasos · {done} de {steps.length}
          </h2>
          <p className="text-sm text-ink-2">Deja todo listo en unos minutos. Toca cada paso para ir directo.</p>
        </div>
      </div>
      <ol className="stagger grid sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title} className="border-line-soft max-sm:border-b sm:border-r">
            <Link href={s.href} className="group flex h-full gap-3 p-4 transition-colors hover:bg-porcelain/60">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-transform duration-300 group-hover:scale-110 ${
                  s.done ? "bg-mint text-white" : "border border-line text-ink-2"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <span>
                <span className={`block text-[15px] font-medium ${s.done ? "text-muted line-through decoration-1" : ""}`}>{s.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{s.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
