"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "../motion/gsap";

const items = [
  {
    title: "Agenda, mueve y cancela citas",
    body: "Conoce tus servicios, sus duraciones y tu capacidad real. Nunca ofrece un horario que no existe ni cruza dos pacientes.",
  },
  {
    title: "Recordatorios que sí se responden",
    body: "Un día antes escribe por WhatsApp. El cliente confirma con una palabra o reprograma ahí mismo, y el espacio vuelve a quedar libre.",
  },
  {
    title: "Contesta llamadas con voz",
    body: "En el plan Profesional, si tu línea timbra cuando estás atendiendo, Velora contesta, entiende lo que te piden y agenda igual que por chat.",
  },
  {
    title: "Sabe cuándo pasarte la conversación",
    body: "Quejas, temas clínicos o pagos llegan a tu equipo con todo el contexto. Desde el panel respondes tú y ella se queda en silencio.",
  },
  {
    title: "Tu agenda y tus chats en un solo panel",
    body: "Ves las citas del día por sillón o profesional, de qué canal llegaron, quién confirmó y qué conversación necesita atención.",
  },
];

export function Capabilities() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const splits = q("[data-fill]").map((el) => {
          const split = SplitText.create(el, { type: "words" });
          gsap.fromTo(
            split.words,
            { color: "var(--color-line)" },
            {
              color: "var(--color-ink)",
              stagger: 0.1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 82%", end: "top 45%", scrub: true },
            },
          );
          return split;
        });
        return () => splits.forEach((s) => s.revert());
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="cap-title" className="bg-paper py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-5">
        <h2 id="cap-title" className="max-w-3xl font-display text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1] font-semibold tracking-[-0.03em]">
          Todo lo que hace tu recepción, sin horario ni días libres.
        </h2>
        <ul className="mt-16 border-t border-line">
          {items.map((it) => (
            <li key={it.title} className="grid gap-4 border-b border-line py-9 md:grid-cols-[1.25fr_1fr] md:gap-12 md:py-12">
              <h3 data-fill className="font-display text-[clamp(1.75rem,3.3vw,2.9rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
                {it.title}
              </h3>
              <p className="max-w-md self-end text-[17px] leading-relaxed text-ink-2">{it.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
