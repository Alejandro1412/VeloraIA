"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, SplitText, useGSAP } from "../motion/gsap";

const thread = [
  { who: "in", text: "Hola, ¿tienen cita para limpieza mañana? 🙏", time: "10:47 p. m." },
  { who: "out", text: "¡Hola Camila! Mañana tengo:\n1. 8:00 a. m.\n2. 10:30 a. m.\n3. 3:00 p. m.", time: "10:47 p. m." },
  { who: "in", text: "La 2 porfa", time: "10:48 p. m." },
  { who: "out", text: "Listo ✅ Quedaste agendada mañana a las 10:30 a. m. Te recuerdo un día antes.", time: "10:48 p. m." },
] as const;

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q("[data-headline], [data-reveal], [data-msg], [data-booked], [data-phone]"), { autoAlpha: 1 });
        return;
      }

      const split = SplitText.create(q("[data-headline]"), { type: "lines", mask: "lines", linesClass: "split-mask" });
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.set(q("[data-headline]"), { autoAlpha: 1 }, 0)
        .from(split.lines, {
          yPercent: 110,
          duration: 1.4,
          stagger: 0.09,
          // Hand the headline back to normal text flow once revealed, so it
          // re-wraps correctly on resize (and if the page loaded off-screen).
          onComplete: () => split.revert(),
        }, 0.15)
        .fromTo(q("[data-reveal]"), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.6)
        .fromTo(q("[data-phone]"), { autoAlpha: 0, y: 60, rotate: 4 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 1.6 }, 0.35);

      // The conversation plays out like it would at 10:47 p. m.
      let at = 1.4;
      q("[data-msg]").forEach((el, i) => {
        const outgoing = el.dataset.msg === "out";
        if (outgoing) {
          tl.fromTo(q("[data-typing]"), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3 }, at);
          at += 0.9;
          tl.to(q("[data-typing]"), { autoAlpha: 0, duration: 0.2 }, at);
        }
        tl.fromTo(
          el,
          { autoAlpha: 0, y: 14, scale: 0.96, transformOrigin: outgoing ? "0% 100%" : "100% 100%" },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.7 },
          at,
        );
        at += i === 0 ? 0.6 : 0.9;
      });
      tl.fromTo(q("[data-booked]"), { autoAlpha: 0, y: 24, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: "back.out(1.6)" }, at);

      // Gentle parallax as the hero leaves.
      gsap.to(q("[data-phone]"), {
        yPercent: -12,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });

      return () => split.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden pt-32 pb-20 sm:pt-40 lg:pb-28">
      <div className="mx-auto grid max-w-[1240px] gap-14 px-5 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-10">
        <div>
          <h1
            data-headline
            className="invisible font-display text-[clamp(2.7rem,5.7vw,5.6rem)] leading-[0.96] font-semibold tracking-[-0.036em] text-ink"
          >
            Tu agenda se llena sola. Incluso a las once de la noche.
          </h1>
          <p data-reveal className="invisible mt-7 max-w-[34rem] text-lg leading-relaxed text-ink-2 sm:text-xl">
            Velora es la recepcionista con IA que contesta tu WhatsApp y tus llamadas, agenda citas en tu horario real,
            las confirma un día antes y las mueve cuando el cliente no puede.
          </p>
          <div data-reveal className="invisible mt-9 flex flex-wrap items-center gap-3">
            <a href="#demo" className="btn-cobalt px-6 py-3.5 text-base">
              Hablar con Sofía ahora
            </a>
            <a href="#precios" className="btn-ghost px-6 py-3.5 text-base">
              Ver planes
            </a>
          </div>
          <p data-reveal className="invisible mt-8 max-w-md text-[15px] text-muted">
            Hecho para odontologías, centros de estética, veterinarias, fisioterapia, barberías y talleres en Colombia.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[400px] lg:mr-0">
          <div
            data-phone
            className="invisible relative rounded-[2.4rem] border border-line bg-paper p-2.5 shadow-[0_40px_80px_-40px_rgba(14,27,61,.45)]"
          >
            <div className="overflow-hidden rounded-[1.9rem] bg-porcelain">
              <div className="flex items-center gap-3 border-b border-line-soft bg-paper px-5 py-4">
                <div className="grid size-10 place-items-center rounded-full bg-ink font-display text-sm font-semibold text-white">S</div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">Sofía · Clínica Sonríe</p>
                  <p className="text-xs text-mint">en línea</p>
                </div>
              </div>
              <div className="flex min-h-[380px] flex-col gap-2.5 px-4 py-5" aria-label="Ejemplo de conversación">
                {thread.map((m, i) => (
                  <div
                    key={i}
                    data-msg={m.who}
                    className={
                      "invisible max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-snug whitespace-pre-line " +
                      (m.who === "in"
                        ? "self-end rounded-br-md bg-ink text-white"
                        : "self-start rounded-bl-md border border-line-soft bg-paper text-ink")
                    }
                  >
                    {m.text}
                    <span className={"mt-1 block text-right text-[11px] tabular " + (m.who === "in" ? "text-white/60" : "text-muted")}>
                      {m.time}
                    </span>
                  </div>
                ))}
                <div data-typing className="invisible flex w-fit gap-1 rounded-2xl rounded-bl-md border border-line-soft bg-paper px-4 py-3" aria-hidden>
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            data-booked
            className="invisible absolute -bottom-8 -left-4 w-[248px] rounded-2xl border border-mint/30 bg-paper p-4 shadow-[0_24px_60px_-28px_rgba(14,27,61,.5)] sm:-left-14"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-mint">
              <span className="grid size-5 place-items-center rounded-full bg-mint text-[11px] text-white">✓</span>
              Nueva cita en tu agenda
            </div>
            <p className="mt-2 font-display text-xl font-semibold tracking-tight">Mañana, 10:30 a. m.</p>
            <p className="text-sm text-muted">Limpieza dental · Camila Herrera</p>
          </div>
        </div>
      </div>
    </section>
  );
}
