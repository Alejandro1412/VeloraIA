"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "../motion/gsap";
import { Logo } from "../brand/Logo";
import { VERTICAL_PAGES } from "@/lib/landing-verticals";

export function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          q("[data-letter]"),
          { yPercent: 105 },
          {
            yPercent: 0,
            ease: "none",
            stagger: 0.06,
            scrollTrigger: { trigger: q("[data-wordmark]")[0], start: "top 98%", end: "bottom 92%", scrub: 0.6 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <footer ref={root} className="overflow-hidden bg-night text-white">
      <div className="mx-auto max-w-[1240px] px-5 pt-24 sm:pt-32">
        <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <h2 className="max-w-2xl font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.98] font-semibold tracking-[-0.036em]">
            Deja de perder citas mientras duermes.
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Hola IONEX, quiero una demostración de Velora para mi negocio.")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-cobalt px-6 py-3.5 text-base"
            >
              Agendar una demostración
            </a>
            <Link href="/registro" className="btn border border-white/25 px-6 py-3.5 text-base text-white hover:border-white">
              Crear mi cuenta
            </Link>
          </div>
        </div>

        <nav aria-label="Velora por tipo de negocio" className="mt-16 flex flex-wrap gap-2">
          {VERTICAL_PAGES.map((v) => (
            <Link
              key={v.slug}
              href={`/para/${v.slug}`}
              className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              {v.emoji} {v.name}
            </Link>
          ))}
        </nav>

        <div className="mt-10 flex flex-col justify-between gap-6 border-t border-white/15 pt-8 text-sm text-white/60 sm:flex-row">
          <div className="flex items-center gap-3 text-white">
            <Logo inverted />
            <span className="text-white/60">Un producto de IONEX</span>
          </div>
          <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/#como-funciona" className="hover:text-white">Cómo funciona</Link>
            <Link href="/#precios" className="hover:text-white">Precios</Link>
            <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
            <span>© 2026 IONEX</span>
          </nav>
        </div>
      </div>
      <p data-wordmark aria-hidden className="mt-6 flex justify-center overflow-hidden font-display text-[27vw] leading-[0.78] font-semibold tracking-[-0.07em] text-white/[0.07] select-none">
        {"Velora".split("").map((l, i) => (
          <span key={i} data-letter className="inline-block">
            {l}
          </span>
        ))}
      </p>
    </footer>
  );
}
