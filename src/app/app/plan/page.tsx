import { Suspense } from "react";
import { clsx } from "clsx";
import { requireOwner } from "@/lib/auth";
import { getBusiness } from "@/lib/accounts";
import { PLANS, subscriptionFor, startOfMonthUtc, type PlanId } from "@/lib/billing";
import { countConversationsSince } from "@/lib/data/store";
import { ionexWompi } from "@/lib/wompi";
import { formatMoney } from "@/lib/domain/time";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { startCheckoutAction } from "../actions";

export default function PlanPage({ searchParams }: PageProps<"/app/plan">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Plan searchParams={searchParams} />
    </Suspense>
  );
}

const NOTICES: Record<string, string> = {
  enviado: "Recibimos tu pago. En cuanto Wompi lo apruebe, tu plan se activa (normalmente en menos de un minuto). Recarga esta página para verlo.",
  "no-disponible": "El pago en línea aún no está activo. Escríbele a IONEX para activar tu plan.",
};

const FEATURES: Record<PlanId, string[]> = {
  esencial: ["Agenda y recepcionista 24/7", "Hasta 400 conversaciones al mes", "Hasta 3 profesionales", "Recordatorios y anticipos"],
  profesional: ["Todo lo de Esencial", "IA conversacional avanzada", "Hasta 1.500 conversaciones al mes", "Hasta 10 profesionales", "Llamadas de voz"],
  sedes: ["Todo lo de Profesional", "Conversaciones ilimitadas", "Hasta 50 profesionales", "Soporte prioritario"],
};

async function Plan({ searchParams }: { searchParams: PageProps<"/app/plan">["searchParams"] }) {
  const session = await requireOwner();
  const query = await searchParams;
  const business = session.demo ? { id: "demo", createdAt: new Date().toISOString() } : await getBusiness(session.businessId);
  if (!business) return null;
  const sub = subscriptionFor(business);
  const used = await countConversationsSince(startOfMonthUtc());
  const limit = sub.limits.conversationsPerMonth;
  const canPay = !!ionexWompi() && !session.demo;
  const notice = typeof query.pago === "string" ? NOTICES[query.pago] : undefined;
  const until = new Date(sub.activeUntil).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Plan y pagos" description="Tu suscripción a Velora. Pagas mes a mes con PSE, Nequi o tarjeta, sin permanencia." />
      <div className="space-y-10 px-5 py-6 lg:px-10">
        {notice && (
          <p role="status" className="rounded-2xl bg-cobalt-soft px-5 py-4 text-[15px]">
            {notice}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-sm text-muted">Plan actual</p>
            <p className="mt-1 font-display text-2xl font-semibold">{sub.trial ? "Prueba gratis" : PLANS[sub.plan].name}</p>
            <p className="mt-1 text-sm text-ink-2">{sub.trial ? "Con todas las funciones de Profesional" : formatMoney(PLANS[sub.plan].price) + " al mes"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-sm text-muted">{sub.daysLeft >= 0 ? "Activo hasta" : "Venció el"}</p>
            <p className="mt-1 font-display text-2xl font-semibold first-letter:uppercase">{until}</p>
            <p className={clsx("mt-1 text-sm", sub.daysLeft < 0 ? "text-rose" : "text-ink-2")}>
              {sub.daysLeft >= 0 ? `Quedan ${sub.daysLeft} días` : sub.serving ? "Estás en el periodo de gracia" : "Agenda en línea pausada"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-sm text-muted">Conversaciones este mes</p>
            <p className="tabular mt-1 font-display text-2xl font-semibold">
              {used}
              <span className="text-base font-normal text-muted"> / {Number.isFinite(limit) ? limit.toLocaleString("es-CO") : "sin límite"}</span>
            </p>
            {Number.isFinite(limit) && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-soft">
                <div className={clsx("h-full rounded-full", used / limit > 0.9 ? "bg-rose" : "bg-cobalt")} style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="plans-title">
          <h2 id="plans-title" className="font-display text-xl font-semibold tracking-tight">
            {sub.trial ? "Elige tu plan" : "Pagar o cambiar de plan"}
          </h2>
          <p className="mt-1 text-sm text-ink-2">Cada pago suma un mes desde la fecha en que termina tu periodo actual.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {(Object.keys(PLANS) as PlanId[]).map((id) => {
              const p = PLANS[id];
              const current = !sub.trial && sub.plan === id;
              return (
                <form key={id} action={startCheckoutAction.bind(null, id)} className={clsx("flex flex-col rounded-[24px] p-6", id === "profesional" ? "bg-ink text-white" : "border border-line bg-paper")}>
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <p className="tabular mt-3 font-display text-3xl font-semibold tracking-tight">
                    {formatMoney(p.price)}
                    <span className="text-sm font-normal opacity-70"> /mes</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {FEATURES[id].map((f) => (
                      <li key={f} className="flex gap-2">
                        <span aria-hidden>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button type="submit" disabled={!canPay} className={clsx("mt-6 w-full", id === "profesional" ? "btn-cobalt" : "btn-ghost")}>
                    {current ? "Pagar otro mes" : `Pagar ${p.name}`}
                  </button>
                </form>
              );
            })}
          </div>
          {!canPay && (
            <p className="mt-4 text-sm text-muted">
              {session.demo ? "Los pagos no están disponibles en la demostración." : "El pago en línea se activa cuando IONEX conecte su cuenta de Wompi. Mientras tanto, escríbenos para activar tu plan."}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
