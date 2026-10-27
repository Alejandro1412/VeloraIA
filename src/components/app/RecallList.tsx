"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { markRecallSentAction } from "@/app/app/actions";

export interface RecallItem {
  appointmentId: string;
  name: string;
  phone: string;
  service: string;
  lastVisit: string;
  dueDate: string;
  message: string;
}

export function RecallList({ items, live, demo }: { items: RecallItem[]; live: boolean; demo: boolean }) {
  const [done, setDone] = useState<string[]>([]);
  const [, start] = useTransition();
  const visible = items.filter((i) => !done.includes(i.appointmentId));
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

  return (
    <div className="mt-4 rounded-2xl border border-line bg-paper">
      {visible.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Nadie tiene su control pendiente hoy. Cuando se cumpla el plazo de un servicio, aparecerá aquí.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          <AnimatePresence initial={false}>
            {visible.map((r) => (
              <motion.li
                key={r.appointmentId}
                layout
                exit={{ opacity: 0, height: 0, x: 40 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-3 px-5 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.name}</span>
                  <span className="text-sm text-muted">
                    {r.service} · última visita {fmt(r.lastVisit)} · le toca desde el {fmt(r.dueDate)}
                  </span>
                </span>
                {live ? (
                  <span className="rounded-full bg-cobalt-soft px-3 py-1 text-xs text-cobalt">Sale mañana a las 8:00 a. m.</span>
                ) : (
                  <a
                    href={`https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(r.message)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (demo) return;
                      start(async () => {
                        await markRecallSentAction(r.appointmentId);
                      });
                      setDone((d) => [...d, r.appointmentId]);
                    }}
                    className="rounded-full bg-mint px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
                  >
                    Enviar por WhatsApp
                  </a>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
