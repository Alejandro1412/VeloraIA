"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "../motion/gsap";

/**
 * Pinned, scroll-scrubbed story: an empty evening agenda fills itself while
 * the reader scrolls. This is the page's one big motion moment.
 */

type Block = {
  id: string;
  chair: 0 | 1;
  start: number; // hour, decimal
  dur: number; // hours
  who: string;
  what: string;
  kind: "existing" | "new";
  moveTo?: number;
};

const START = 8;
const END = 18;

const blocks: Block[] = [
  { id: "e1", chair: 0, start: 8, dur: 1, who: "Felipe D.", what: "Valoración", kind: "existing" },
  { id: "e2", chair: 1, start: 9.5, dur: 1, who: "Sara M.", what: "Limpieza", kind: "existing" },
  { id: "e3", chair: 0, start: 15, dur: 0.5, who: "Tomás E.", what: "Control", kind: "existing" },
  { id: "n1", chair: 0, start: 9, dur: 1, who: "Camila H.", what: "Limpieza", kind: "new" },
  { id: "n2", chair: 1, start: 8, dur: 1.5, who: "Laura R.", what: "Blanqueamiento", kind: "new" },
  { id: "n3", chair: 0, start: 10.5, dur: 0.5, who: "Mateo C.", what: "Ortodoncia", kind: "new", moveTo: 16 },
  { id: "n4", chair: 1, start: 11, dur: 0.5, who: "Isabella M.", what: "Urgencia", kind: "new" },
  { id: "n5", chair: 0, start: 14, dur: 1, who: "Andrés C.", what: "Limpieza", kind: "new" },
  { id: "n6", chair: 1, start: 14, dur: 0.5, who: "Paula Z.", what: "Valoración", kind: "new" },
  { id: "n7", chair: 1, start: 15, dur: 1.5, who: "Daniela O.", what: "Blanqueamiento", kind: "new" },
  { id: "n8", chair: 0, start: 16.5, dur: 1, who: "Nicolás V.", what: "Limpieza", kind: "new" },
];

const feed = [
  "¿Tienen cita mañana para limpieza?",
  "Buenas, me duele una muela 😣",
  "Quisiera blanqueamiento, ¿precio?",
  "¿Atienden el sábado?",
  "Necesito control de brackets",
];

const captions = [
  {
    when: "10:47 p. m.",
    title: "Tu consultorio está cerrado. Tus clientes no.",
    body: "Llegan mensajes preguntando por citas, precios y horarios. Sin Velora, se responden mañana, cuando muchos ya agendaron en otro lado.",
  },
  {
    when: "10:48 p. m.",
    title: "Sofía contesta cada mensaje en segundos.",
    body: "Ofrece solo horarios realmente libres, respeta tu hora de almuerzo y la capacidad de cada sillón, y agenda sin cruces.",
  },
  {
    when: "Un día antes",
    title: "Confirma, y si alguien no puede, lo mueve.",
    body: "Envía el recordatorio por WhatsApp. Quien no puede asistir reprograma en el mismo chat y el espacio queda libre para otro paciente.",
  },
  {
    when: "8:00 a. m.",
    title: "Abres el panel y la agenda ya está lista.",
    body: "Cada cita con su servicio, su canal de origen y su estado. Tu equipo solo atiende.",
  },
];

const pct = (h: number) => ((h - START) / (END - START)) * 100;

export function AgendaStory() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const counters = { msgs: 0, booked: 0, confirmed: 0 };
        const render = () => {
          q("[data-count=msgs]")[0].textContent = String(Math.round(counters.msgs));
          q("[data-count=booked]")[0].textContent = String(Math.round(counters.booked));
          q("[data-count=confirmed]")[0].textContent = String(Math.round(counters.confirmed));
        };

        gsap.set(q("[data-block=new]"), { autoAlpha: 0, scale: 0.6 });
        gsap.set(q("[data-feed]"), { autoAlpha: 0, x: 40 });
        gsap.set(q("[data-caption]"), { autoAlpha: 0, y: 40 });
        gsap.set(q("[data-caption='0']"), { autoAlpha: 1, y: 0 });
        gsap.set(q("[data-state=confirmed]"), { autoAlpha: 0 });
        gsap.set(q("[data-state=moved]"), { autoAlpha: 0 });
        gsap.set(q("[data-progress]"), { scaleY: 0 });
        counters.msgs = counters.booked = counters.confirmed = 0;
        render();

        const tl = gsap.timeline({
          defaults: { ease: "power3.out", duration: 1 },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "+=320%",
            pin: q("[data-pin]")[0],
            scrub: 0.9,
            anticipatePin: 1,
          },
        });

        const caption = (i: number, at: number) =>
          tl
            .to(q(`[data-caption='${i - 1}']`), { autoAlpha: 0, y: -40, duration: 0.6, ease: "power2.in" }, at)
            .to(q(`[data-caption='${i}']`), { autoAlpha: 1, y: 0, duration: 0.8 }, at + 0.5);

        tl.to(q("[data-progress]"), { scaleY: 1, ease: "none", duration: 10 }, 0);

        // Stage 1: messages pile up
        tl.to(q("[data-feed]"), { autoAlpha: 1, x: 0, stagger: 0.35, duration: 0.7 }, 0.3);
        tl.to(counters, { msgs: 9, ease: "none", duration: 1.8, onUpdate: render }, 0.3);

        // Stage 2: Sofía books
        caption(1, 2.2);
        tl.to(q("[data-feed]"), { autoAlpha: 0, x: 24, stagger: 0.05, duration: 0.5, ease: "power2.in" }, 2.5);
        tl.to(q("[data-block=new]"), { autoAlpha: 1, scale: 1, stagger: 0.32, duration: 0.8, ease: "back.out(1.4)" }, 2.9);
        tl.to(counters, { booked: 8, ease: "none", duration: 2.6, onUpdate: render }, 2.9);

        // Stage 3: reminders confirm, one reschedules
        caption(2, 5.8);
        tl.to(q("[data-state=confirmed]"), { autoAlpha: 1, stagger: 0.12, duration: 0.5 }, 6.3);
        tl.to(counters, { confirmed: 10, ease: "none", duration: 1.6, onUpdate: render }, 6.3);
        const moving = blocks.find((b) => b.moveTo)!;
        tl.to(q(`[data-id=${moving.id}] [data-state=moved]`), { autoAlpha: 1, duration: 0.4 }, 6.5);
        tl.to(q(`[data-id=${moving.id}]`), { top: `${pct(moving.moveTo!)}%`, duration: 1.4, ease: "power3.inOut" }, 7);

        // Stage 4: the morning view
        caption(3, 8.4);
        tl.to(q("[data-board]"), { scale: 1.02, duration: 1.2, ease: "power2.inOut" }, 8.6).to(q("[data-board]"), { scale: 1, duration: 0.8 }, 9.8);
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="como-funciona" aria-label="Así funciona Velora en una noche" className="relative bg-night text-white">
      <div data-pin className="relative flex h-dvh items-center overflow-hidden py-6 lg:py-0">
        <div className="mx-auto grid w-full max-w-[1240px] gap-5 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          {/* Narrative */}
          <div className="relative flex gap-6">
            <div className="relative hidden w-px shrink-0 bg-white/15 lg:block" aria-hidden>
              <div data-progress className="absolute inset-0 origin-top bg-cobalt" />
            </div>
            <div className="relative grid min-h-[178px] w-full sm:min-h-[260px] motion-reduce:flex motion-reduce:flex-col motion-reduce:gap-10">
              {captions.map((c, i) => (
                <div key={i} data-caption={i} className="col-start-1 row-start-1">
                  <p className="tabular text-sm text-white/55">{c.when}</p>
                  <h2 className="mt-2 font-display text-[clamp(1.6rem,3.6vw,3.1rem)] sm:mt-3 leading-[1.02] font-semibold tracking-[-0.035em]">
                    {c.title}
                  </h2>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70 sm:mt-5 sm:text-[17px]">{c.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agenda board */}
          <div className="relative">
            <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3">
              {[
                { k: "msgs", label: "Mensajes respondidos", final: 9 },
                { k: "booked", label: "Citas nuevas", final: 8 },
                { k: "confirmed", label: "Confirmadas", final: 10 },
              ].map((c) => (
                <div key={c.k} className="rounded-2xl border border-white/10 px-3 py-2 sm:px-4 sm:py-3">
                  <p data-count={c.k} className="tabular font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    {c.final}
                  </p>
                  <p className="text-xs text-white/55 sm:text-sm">{c.label}</p>
                </div>
              ))}
            </div>

            <div data-board className="relative rounded-3xl bg-paper p-3 text-ink shadow-[0_50px_100px_-40px_rgba(0,0,0,.6)] sm:p-4">
              <div className="flex items-baseline justify-between px-1 pb-3">
                <p className="font-display text-lg font-semibold tracking-tight">Martes 27 de octubre</p>
                <p className="hidden text-sm text-muted sm:block">Clínica Dental Sonríe</p>
              </div>
              <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-xs text-muted">
                <span />
                <span className="px-1">Sillón 1</span>
                <span className="px-1">Sillón 2</span>
              </div>
              <div className="relative mt-2 grid h-[clamp(200px,33dvh,300px)] lg:h-[clamp(300px,52vh,470px)] grid-cols-[40px_1fr_1fr] gap-2">
                {/* hour grid */}
                <div className="relative">
                  {Array.from({ length: END - START }, (_, i) => (
                    <span key={i} className="tabular absolute -translate-y-1/2 text-[11px] text-muted" style={{ top: `${(i / (END - START)) * 100}%` }}>
                      {START + i}:00
                    </span>
                  ))}
                </div>
                {[0, 1].map((chair) => (
                  <div key={chair} className="relative rounded-xl bg-porcelain">
                    {Array.from({ length: END - START }, (_, i) => (
                      <span key={i} className="absolute inset-x-0 border-t border-line-soft" style={{ top: `${(i / (END - START)) * 100}%` }} />
                    ))}
                    <div className="absolute inset-x-0 rounded-md bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(91,104,134,.12)_6px_7px)]" style={{ top: `${pct(12.5)}%`, height: `${pct(14) - pct(12.5)}%` }}>
                      <span className="absolute left-2 top-1 text-[10px] text-muted">Almuerzo</span>
                    </div>
                    {blocks
                      .filter((b) => b.chair === chair)
                      .map((b) => (
                        <div
                          key={b.id}
                          data-id={b.id}
                          data-block={b.kind}
                          className={
                            "absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-[11px] leading-tight sm:text-xs " +
                            (b.kind === "existing" ? "bg-line-soft text-ink-2" : "bg-cobalt text-white")
                          }
                          style={{ top: `${pct(b.start)}%`, height: `calc(${(b.dur / (END - START)) * 100}% - 3px)` }}
                        >
                          <p className="truncate font-semibold">{b.who}</p>
                          {b.dur >= 1 && <p className="hidden truncate opacity-75 sm:block">{b.what}</p>}
                          <span data-state="confirmed" className="absolute top-1 right-1.5 grid size-4 place-items-center rounded-full bg-mint text-[9px] text-white">
                            ✓
                          </span>
                          {b.moveTo && (
                            <span data-state="moved" className="absolute right-6 top-1 rounded bg-amber px-1 text-[9px] font-medium text-ink">
                              Reprogramó
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>

            {/* incoming WhatsApp feed */}
            <div className="pointer-events-none absolute top-36 right-6 hidden w-64 flex-col gap-2 lg:flex motion-reduce:hidden" aria-hidden>
              {feed.map((f, i) => (
                <div key={i} data-feed className="rounded-2xl rounded-tr-md border border-line-soft bg-paper px-3.5 py-2.5 text-[13px] text-ink shadow-[0_18px_40px_-12px_rgba(14,27,61,.45)]" style={{ marginLeft: `${(i % 2) * 24}px` }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
