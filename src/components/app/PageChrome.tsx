"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

/** "←" that returns to the previous screen inside Velora, or to a sensible parent. */
export function BackButton({ fallback = "/app", label = "Volver" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  const goBack = () => {
    const sameSite = document.referrer && new URL(document.referrer).origin === location.origin;
    if (window.history.length > 1 && sameSite) router.back();
    else router.push(fallback);
  };
  return (
    <button
      type="button"
      onClick={goBack}
      className="group -ml-1 inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-sm text-muted transition-colors hover:bg-line-soft hover:text-ink"
    >
      <span className="grid size-7 place-items-center rounded-full border border-line bg-paper transition-transform duration-300 group-hover:-translate-x-0.5">
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12.5 4.5L7 10l5.5 5.5" />
        </svg>
      </span>
      {label}
    </button>
  );
}

export interface HelpStep {
  title: string;
  body: string;
}

/** Collapsible visual guide for a section. Opens by itself the first time. */
export function HelpPanel({ id, steps }: { id: string; steps: HelpStep[] }) {
  const key = `velora-help-${id}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) {
        const id = requestAnimationFrame(() => {
          setOpen(true);
          try {
            localStorage.setItem(key, "1");
          } catch {}
        });
        return () => cancelAnimationFrame(id);
      }
    } catch {}
  }, [key]);

  return (
    <div className="px-5 lg:px-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-cobalt hover:text-cobalt"
      >
        <span className="grid size-5 place-items-center rounded-full bg-cobalt-soft text-[12px] font-semibold text-cobalt">?</span>
        {open ? "Ocultar ayuda" : "¿Cómo funciona esta sección?"}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            key="help"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-3 overflow-hidden sm:grid-cols-2 xl:grid-cols-4"
          >
            {steps.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.06 * i + 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={`spotlight flex gap-3 rounded-2xl border border-line bg-paper p-4 ${i === 0 ? "mt-3" : "sm:mt-3"}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cobalt to-mint font-display text-sm font-semibold text-white shadow-[0_6px_16px_-6px_var(--color-cobalt)]">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium">{s.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-2">{s.body}</span>
                </span>
              </motion.li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
