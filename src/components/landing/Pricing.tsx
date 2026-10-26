import Link from "next/link";
import { clsx } from "clsx";

export const PLANS = [
  {
    name: "Esencial",
    price: 249000,
    for: "Un consultorio o local que quiere dejar de perder mensajes.",
    features: [
      "Recepcionista en WhatsApp 24/7",
      "Hasta 400 conversaciones al mes",
      "Agenda, reprogramación y cancelación",
      "Recordatorios automáticos",
      "Panel de agenda y conversaciones",
    ],
  },
  {
    name: "Profesional",
    price: 449000,
    for: "Clínicas y centros con varios profesionales o sillones.",
    featured: true,
    features: [
      "Todo lo del plan Esencial",
      "IA conversacional avanzada (Claude)",
      "Hasta 1.500 conversaciones al mes",
      "Atención de llamadas con voz",
      "Traspaso a tu equipo con contexto",
      "Revisión mensual de resultados",
    ],
  },
  {
    name: "Sedes",
    price: 690000,
    priceNote: "desde",
    for: "Negocios con varias sedes o alto volumen.",
    features: [
      "Todo lo del plan Profesional",
      "Varias sedes y números",
      "Conversaciones ilimitadas",
      "Integración con tu software actual",
      "Soporte prioritario por WhatsApp",
    ],
  },
] as const;

const money = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);

export function Pricing() {
  return (
    <section id="precios" aria-labelledby="pricing-title" className="bg-paper py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-5">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 id="pricing-title" className="max-w-2xl font-display text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1] font-semibold tracking-[-0.03em]">
            Un precio fijo al mes. Sin contratos de permanencia.
          </h2>
          <p className="max-w-sm text-[16px] leading-relaxed text-ink-2">
            Implementación única desde $500.000 COP según tu número de servicios y canales. Precios en pesos colombianos, IVA no incluido.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3 lg:gap-0">
          {PLANS.map((p, i) => (
            <article
              key={p.name}
              className={clsx(
                "flex flex-col rounded-[28px] p-8 sm:p-9",
                "featured" in p && p.featured ? "bg-ink text-white lg:-my-4 lg:py-13" : "border border-line lg:rounded-none lg:border-0",
                i === 0 && "lg:border-r lg:border-line",
                i === 2 && "lg:border-l lg:border-line",
              )}
            >
              <h3 className="font-display text-2xl font-semibold tracking-tight">{p.name}</h3>
              <p className={clsx("mt-2 min-h-12 text-[15px]", "featured" in p && p.featured ? "text-white/70" : "text-ink-2")}>{p.for}</p>
              <p className="mt-8 flex items-baseline gap-1.5">
                {"priceNote" in p && <span className="text-sm opacity-70">{p.priceNote}</span>}
                <span className="tabular font-display text-5xl font-semibold tracking-[-0.03em]">${money(p.price)}</span>
                <span className="text-sm opacity-70">/mes</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3.5 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <svg viewBox="0 0 16 16" className={clsx("mt-1 size-4 shrink-0", "featured" in p && p.featured ? "text-mint" : "text-cobalt")} aria-hidden>
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/registro?plan=${p.name.toLowerCase()}`}
                className={clsx("mt-10 w-full", "featured" in p && p.featured ? "btn-cobalt" : "btn-ghost")}
              >
                Empezar con {p.name}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
