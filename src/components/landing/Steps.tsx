"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "../motion/gsap";

const steps = [
  {
    title: "Nos cuentas cómo trabajas",
    body: "En una llamada de 30 minutos levantamos tus servicios, duraciones, precios, horarios, pausas y cuántas citas atiendes al mismo tiempo.",
    detail: "Día 1",
  },
  {
    title: "Configuramos a tu recepcionista",
    body: "Le damos nombre, tono y reglas: qué hacer con una urgencia, cuándo pasarle la conversación a tu equipo y qué nunca debe prometer.",
    detail: "Días 1 y 2",
  },
  {
    title: "Conectamos tu WhatsApp y tu línea",
    body: "Usamos la API oficial de WhatsApp Business y, si quieres, un número de voz. Tus clientes escriben al mismo número de siempre.",
    detail: "Días 2 y 3",
  },
  {
    title: "Empieza a agendar",
    body: "Desde el primer día ves cada cita y cada conversación en tu panel. Revisamos contigo los resultados cada mes.",
    detail: "Día 3 en adelante",
  },
];

export function Steps() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const track = q("[data-track]")[0] as HTMLElement;
        const distance = () => track.scrollWidth - window.innerWidth + 40;
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        q("[data-step]").forEach((el) => {
          gsap.fromTo(
            el.querySelector("[data-num]"),
            { yPercent: 40, autoAlpha: 0.15 },
            {
              yPercent: 0,
              autoAlpha: 1,
              ease: "none",
              scrollTrigger: { trigger: el, containerAnimation: tween, start: "left 85%", end: "left 40%", scrub: true },
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="steps-title" className="relative overflow-hidden bg-porcelain py-24 md:flex md:h-dvh md:items-center md:py-0">
      <div data-track className="flex flex-col gap-6 px-5 md:w-max md:flex-row md:items-stretch md:gap-8 md:pl-[max(20px,calc((100vw_-_1240px)/2_+_20px))]">
        <div className="md:w-[34vw] md:max-w-[460px] md:shrink-0 md:self-center">
          <h2 id="steps-title" className="font-display text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[0.98] font-semibold tracking-[-0.03em]">
            En tres días, tu recepción trabaja sola.
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-ink-2">
            Nosotros hacemos la configuración. Tú no instalas nada ni aprendes un programa nuevo.
          </p>
        </div>
        {steps.map((s, i) => (
          <article
            key={s.title}
            data-step
            className="flex flex-col justify-between rounded-[28px] border border-line bg-paper p-7 md:h-[min(68vh,560px)] md:w-[min(30vw,420px)] md:shrink-0 md:p-9"
          >
            <div className="flex items-start justify-between">
              <span data-num className="font-display text-[clamp(4.5rem,9vw,8.5rem)] leading-[0.8] font-semibold tracking-[-0.06em] text-cobalt">
                {i + 1}
              </span>
              <span className="rounded-full bg-porcelain px-3 py-1 text-sm text-ink-2">{s.detail}</span>
            </div>
            <div className="mt-10">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">{s.title}</h3>
              <p className="mt-3 text-[16.5px] leading-relaxed text-ink-2">{s.body}</p>
            </div>
          </article>
        ))}
        <div className="hidden w-[6vw] shrink-0 md:block" />
      </div>
    </section>
  );
}
