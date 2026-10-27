import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { cashbox } from "@/lib/cashbox";
import { getSettings } from "@/lib/data/store";
import { addDays, formatDateEs, localParts } from "@/lib/domain/time";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { CountUp } from "@/components/fx/CountUp";
import { CashTable } from "@/components/app/CashTable";

const HELP = {
  id: "caja",
  steps: [
    { title: "Registra al atender", body: "En la agenda, “Marcar atendida” te pregunta cuánto pagó y cómo." },
    { title: "Cierre del día", body: "Total recibido y por medio de pago: efectivo, tarjeta, Nequi…" },
    { title: "Pendientes", body: "Citas atendidas sin pago registrado: complétalas aquí mismo." },
    { title: "Exporta", body: "Descarga el día en Excel para tu contador." },
  ],
};

export default function CashPage({ searchParams }: PageProps<"/app/caja">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Cash searchParams={searchParams} />
    </Suspense>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

async function Cash({ searchParams }: { searchParams: PageProps<"/app/caja">["searchParams"] }) {
  await requireSession();
  const [settings, q] = await Promise.all([getSettings(), searchParams]);
  const today = localParts(new Date(), settings.utcOffsetMinutes).date;
  const day = typeof q.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.fecha) && q.fecha <= today ? q.fecha : today;
  const c = await cashbox(day, addDays(day, 1));
  const max = Math.max(1, ...c.byMethod.map((m) => m.amount));

  return (
    <>
      <PageHeader
        help={HELP}
        title="Caja"
        description={`${formatDateEs(day).replace(/^./, (x) => x.toUpperCase())}${day === today ? " · hoy" : ""}`}
        actions={
          <>
            <Link href={`/app/caja?fecha=${addDays(day, -1)}`} className="btn-ghost btn-sm">
              ← Día anterior
            </Link>
            {day < today && (
              <Link href={`/app/caja?fecha=${addDays(day, 1)}`} className="btn-ghost btn-sm">
                Día siguiente →
              </Link>
            )}
            <a href={`/api/export/caja?fecha=${day}`} className="btn-ghost btn-sm">
              Descargar Excel
            </a>
          </>
        }
      />
      <div className="space-y-8 px-5 py-6 lg:px-10">
        <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="relative animate-[rise_800ms_var(--ease-out-expo)_both] overflow-hidden rounded-[28px] bg-night p-7 text-white">
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-mint/30 blur-3xl" />
            <p className="relative text-sm text-white/70">Total recibido</p>
            <p className="tabular relative mt-2 font-display text-5xl font-semibold tracking-[-0.03em]">
              <CountUp value={money(c.total)} />
            </p>
            <p className="relative mt-3 text-sm text-white/70">
              {c.lines.filter((l) => l.kind === "visit").length} citas atendidas
              {c.pending > 0 && <span className="ml-2 rounded-full bg-amber/90 px-2 py-0.5 text-xs font-medium text-night">{c.pending} sin pago registrado</span>}
            </p>
          </div>
          <div className="spotlight rounded-[28px] border border-line bg-paper p-6">
            <p className="font-medium">Por medio de pago</p>
            {c.byMethod.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aún no hay pagos registrados este día.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {c.byMethod.map((m, i) => (
                  <li key={m.method}>
                    <div className="flex justify-between text-[15px]">
                      <span>{m.label}</span>
                      <span className="tabular font-medium">{money(m.amount)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line-soft">
                      <div
                        className="h-full origin-left animate-[grow-x_1000ms_var(--ease-out-expo)_both] rounded-full bg-gradient-to-r from-cobalt to-mint"
                        style={{ width: `${(m.amount / max) * 100}%`, animationDelay: `${i * 80}ms` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <CashTable lines={c.lines} />
      </div>
    </>
  );
}
