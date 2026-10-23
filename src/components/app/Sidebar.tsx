"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const items = [
  { href: "/app", label: "Resumen", icon: "M3 12h4l3-8 4 16 3-8h4" },
  { href: "/app/agenda", label: "Agenda", icon: "M4 6h16v14H4zM4 10h16M9 3v4m6-4v4" },
  { href: "/app/conversaciones", label: "Conversaciones", icon: "M4 5h16v11H8l-4 4z" },
  { href: "/app/servicios", label: "Servicios", icon: "M5 7h14M5 12h14M5 17h9" },
  { href: "/app/ajustes", label: "Ajustes", icon: "M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6l1.4 1.4m0-11.4l-1.4 1.4M7.7 16.3l-1.4 1.4" },
];

export function Sidebar() {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

  return (
    <nav aria-label="Panel" className="contents lg:mt-8 lg:block">
      {/* desktop */}
      <ul className="hidden space-y-1 lg:block">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={active(it.href) ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
                active(it.href) ? "bg-ink text-white" : "text-ink-2 hover:bg-porcelain hover:text-ink",
              )}
            >
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
      {/* mobile bottom bar */}
      <ul className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={active(it.href) ? "page" : undefined}
              className={clsx("flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px]", active(it.href) ? "text-cobalt" : "text-muted")}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
