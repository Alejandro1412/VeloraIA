"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { IntakeField } from "@/lib/domain/types";
import { saveIntakeFromLink } from "@/app/cita/actions";
import { IntakeFieldInput } from "@/components/app/IntakeFieldInput";

export function IntakeForm({
  refs,
  fields,
  initial,
}: {
  refs: { businessId: string; appointmentId: string; token: string };
  fields: IntakeField[];
  initial?: Record<string, string | boolean>;
}) {
  const [answers, setAnswers] = useState<Record<string, string | boolean>>(initial ?? {});
  const [state, setState] = useState<"idle" | "saved">(initial ? "saved" : "idle");
  const [open, setOpen] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = fields.filter((f) => answers[f.id] !== undefined && answers[f.id] !== "" && answers[f.id] !== false).length;

  return (
    <section className="mt-6 animate-[rise_800ms_var(--ease-out-expo)_200ms_both] rounded-[28px] border border-line bg-paper p-6">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block font-display text-xl font-semibold tracking-tight">Antes de tu cita</span>
          <span className="text-sm text-muted">{state === "saved" ? "¡Gracias! Ya recibimos tus respuestas. Puedes editarlas." : "Tómate un minuto para contarnos esto."}</span>
        </span>
        <span className="relative grid size-11 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute size-11 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-line-soft)" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--color-mint)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={94.2}
              strokeDashoffset={94.2 * (1 - done / Math.max(1, fields.length))}
              style={{ transition: "stroke-dashoffset 500ms cubic-bezier(.16,1,.3,1)" }}
            />
          </svg>
          <span className="text-xs font-semibold">
            {done}/{fields.length}
          </span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                setError(null);
                const r = await saveIntakeFromLink(refs, answers);
                if (r.error) return setError(r.error);
                setState("saved");
                setOpen(false);
              });
            }}
          >
            <div className="space-y-4 pt-5">
              {fields.map((f) => (
                <IntakeFieldInput key={f.id} field={f} value={answers[f.id]} onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))} />
              ))}
              {error && (
                <p role="alert" className="text-sm text-rose">
                  {error}
                </p>
              )}
              <button type="submit" disabled={pending} className="btn-primary w-full">
                {pending ? "Enviando…" : "Enviar respuestas"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
