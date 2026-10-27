"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { ThemeToggle } from "../fx/ThemeToggle";

interface Item {
  href: string;
  label: string;
  icon: string;
  ownerOnly?: boolean;
  primary?: boolean;
}

const items: Item[] = [
  { href: "/app", label: "Resumen", icon: "M3 12h4l3-8 4 16 3-8h4", primary: true },
  { href: "/app/agenda", label: "Agenda", icon: "M4 6h16v14H4zM4 10h16M9 3v4m6-4v4", primary: true },
  { href: "/app/conversaciones", label: "Conversaciones", icon: "M4 5h16v11H8l-4 4z", primary: true },
  { href: "/app/probar", label: "Probar recepcionista", icon: "M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" },
  { href: "/app/clientes", label: "Clientes", icon: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M15 4.1a3 3 0 010 5.8", primary: true },
  { href: "/app/caja", label: "Caja", icon: "M3 7h18v12H3zM3 11h18M7 15h4M16 4l-2 3M8 4l2 3" },
  { href: "/app/informe", label: "Informe mensual", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2", ownerOnly: true },
  { href: "/app/campanas", label: "Campañas", icon: "M3 11l15-6v14L3 13zM7 12.5V18a2 2 0 004 0v-4", ownerOnly: true },
  { href: "/app/servicios", label: "Servicios", icon: "M5 7h14M5 12h14M5 17h9", ownerOnly: true },
  { href: "/app/formulario", label: "Formulario previo", icon: "M9 4h6v3H9zM6 6h12v15H6zM9 11h6M9 15h4", ownerOnly: true },
  { href: "/app/profesionales", label: "Profesionales", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0", ownerOnly: true },
  { href: "/app/equipo", label: "Equipo", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", ownerOnly: true },
  { href: "/app/sedes", label: "Sedes", icon: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6", ownerOnly: true },
  { href: "/app/plan", label: "Plan y pagos", icon: "M3 7h18v10H3zM3 11h18M7 15h3", ownerOnly: true },
  { href: "/app/ajustes", label: "Ajustes", ownerOnly: true, icon: "M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6l1.4 1.4m0-11.4l-1.4 1.4M7.7 16.3l-1.4 1.4" },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Sidebar({ role = "owner", unread = 0 }: { role?: "owner" | "staff"; unread?: number }) {
  const path = usePathname();
  const [more, setMore] = useState(false);

  const visible = items.filter((i) => role === "owner" || !i.ownerOnly);
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  const primary = visible.filter((i) => i.primary);
  const secondary = visible.filter((i) => !i.primary);

  return (
    <nav aria-label="Panel" className="contents lg:mt-8 lg:block">
      {/* desktop */}
      <ul className="relative isolate hidden space-y-1 lg:block">
        {visible.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={active(it.href) ? "page" : undefined}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors duration-300",
                active(it.href) ? "text-white" : "text-ink-2 hover:bg-porcelain hover:text-ink",
              )}
            >
              {active(it.href) && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-xl bg-night shadow-[0_8px_24px_-12px_var(--color-night)]"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <Icon d={it.icon} className="size-[18px] transition-transform duration-300 group-hover:scale-110" />
              {it.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/app/notificaciones"
            aria-current={active("/app/notificaciones") ? "page" : undefined}
            className={clsx(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors duration-300",
              active("/app/notificaciones") ? "text-white" : "text-ink-2 hover:bg-porcelain hover:text-ink",
            )}
          >
            {active("/app/notificaciones") && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 -z-10 rounded-xl bg-night shadow-[0_8px_24px_-12px_var(--color-night)]"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <Icon d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" className="size-[18px]" />
            Avisos
            {unread > 0 && (
              <span className="tabular ml-auto animate-[pop_500ms_var(--ease-out-expo)_both] rounded-full bg-cobalt px-2 py-0.5 text-xs font-semibold text-white" aria-label={`${unread} sin leer`}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </li>
      </ul>

      {/* mobile: theme + bell in the top bar */}
      <ThemeToggle className="ml-auto lg:hidden" />
      <Link href="/app/notificaciones" className="relative grid size-10 place-items-center rounded-full text-ink-2 lg:hidden" aria-label={`Avisos${unread ? `, ${unread} sin leer` : ""}`}>
        <Icon d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" className="size-5" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 animate-ping rounded-full bg-cobalt/60" />}
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-cobalt" />}
      </Link>

      {/* mobile bottom bar */}
      <ul className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {primary.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={active(it.href) ? "page" : undefined}
              className={clsx("relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] transition-colors", active(it.href) ? "text-cobalt" : "text-muted")}
            >
              {active(it.href) && <motion.span layoutId="tab-dot" className="absolute -top-1.5 h-1 w-8 rounded-full bg-cobalt" />}
              <Icon d={it.icon} className="size-5" />
              {it.label}
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className={clsx("flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[11px]", more || secondary.some((i) => active(i.href)) ? "text-cobalt" : "text-muted")}
          >
            <Icon d="M5 12h.01M12 12h.01M19 12h.01" className="size-5" />
            Más
          </button>
        </li>
      </ul>
      {more && (
        <div className="fixed inset-x-3 bottom-20 z-40 animate-[rise_400ms_var(--ease-out-expo)_both] rounded-3xl border border-line bg-paper p-2 shadow-2xl lg:hidden">
          {secondary.map((it) => (
            <Link key={it.href} href={it.href} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] hover:bg-porcelain">
              <Icon d={it.icon} className="size-5 text-ink-2" />
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
