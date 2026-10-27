"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Logo } from "../brand/Logo";
import { ThemeToggle } from "../fx/ThemeToggle";

const links = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#demo", label: "Demo en vivo" },
  { href: "/#ahorro", label: "Calcula tu ahorro" },
  { href: "/#precios", label: "Precios" },
];

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const last = useRef(0);
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      setHidden(y > 400 && y > last.current && !open);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      last.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-(--ease-out-expo)",
        hidden && "-translate-y-full",
      )}
    >
      <span
        ref={progress}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-cobalt via-mint to-cobalt"
      />
      <nav
        aria-label="Principal"
        className={clsx(
          "mx-3 mt-3 flex max-w-[1240px] items-center justify-between rounded-full px-4 py-2.5 transition-[background-color,box-shadow,backdrop-filter] duration-500 sm:mx-4 xl:mx-auto",
          solid ? "bg-porcelain/80 shadow-[0_1px_0_var(--color-line),0_12px_40px_-24px_rgba(14,27,61,.35)] backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <Link href="/" aria-label="Velora, inicio">
          <Logo showByline />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="group relative rounded-full px-3.5 py-2 text-[15px] text-ink-2 transition-colors hover:text-ink">
                {l.label}
                <span className="absolute inset-x-3.5 bottom-1 h-px origin-left scale-x-0 bg-cobalt transition-transform duration-500 ease-(--ease-out-expo) group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-full px-3.5 py-2 text-[15px] text-ink-2 hover:text-ink sm:inline-block">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="btn-primary btn-sm">
            Crear cuenta
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-5">
              <span className={clsx("absolute left-0 h-0.5 w-5 bg-ink transition-transform duration-300", open ? "top-1.5 rotate-45" : "top-0")} />
              <span className={clsx("absolute left-0 h-0.5 w-5 bg-ink transition-transform duration-300", open ? "top-1.5 -rotate-45" : "top-2.5")} />
            </span>
          </button>
        </div>
      </nav>
      <div
        id="mobile-menu"
        className={clsx(
          "mx-3 mt-2 overflow-hidden rounded-3xl bg-paper shadow-xl transition-[max-height,opacity] duration-500 ease-(--ease-out-expo) lg:hidden",
          open ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <ul className="p-3">
          {[...links, { href: "/login", label: "Iniciar sesión" }, { href: "/registro", label: "Crear cuenta" }].map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-lg font-medium hover:bg-porcelain">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
