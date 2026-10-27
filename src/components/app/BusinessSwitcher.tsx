"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { switchBusinessAction } from "@/app/app/actions";

/** Name of the person + current business, with a menu to jump between locations. */
export function BusinessSwitcher({
  person,
  current,
  businesses,
  canAdd,
  admin,
}: {
  person: string;
  current: { id: string; name: string; role: "owner" | "staff" };
  businesses: { id: string; name: string; role: "owner" | "staff" }[];
  canAdd: boolean;
  admin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const others = businesses.filter((b) => b.id !== current.id);

  return (
    <div className="relative min-w-0 border-t border-line px-1 pt-3 pb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-porcelain"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{person}</span>
          <span className="block truncate text-xs text-muted">
            {current.name}
            {current.role === "staff" ? " · Equipo" : ""}
          </span>
        </span>
        <svg viewBox="0 0 20 20" className={clsx("size-4 shrink-0 text-muted transition-transform duration-300", open && "rotate-180")} aria-hidden>
          <path d="M5 12l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 bottom-full left-0 z-40 mb-2 rounded-2xl border border-line bg-paper p-1.5 shadow-2xl"
          >
            {others.length > 0 && <p className="px-3 pt-2 pb-1 text-xs text-muted">Cambiar de sede</p>}
            {others.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={pending}
                onClick={() => start(() => switchBusinessAction(b.id))}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-porcelain"
              >
                <span className="grid size-6 place-items-center rounded-lg bg-cobalt-soft text-xs font-semibold text-cobalt">{b.name[0]}</span>
                <span className="truncate">{b.name}</span>
              </button>
            ))}
            {canAdd && (
              <Link href="/app/sedes" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-cobalt hover:bg-cobalt-soft">
                <span className="grid size-6 place-items-center rounded-lg border border-dashed border-cobalt text-xs">+</span>
                Agregar sede
              </Link>
            )}
            {admin && (
              <Link href="/admin" className="mt-1 flex items-center gap-2 rounded-xl border-t border-line-soft px-3 py-2 text-sm hover:bg-porcelain">
                <span className="rounded-md bg-night px-1.5 py-0.5 text-[10px] font-semibold text-white">IONEX</span>
                Administración
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
