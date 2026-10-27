"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { rateVisit } from "@/app/opinion/actions";
import { confetti } from "@/components/fx/confetti";

const LABELS = ["", "Muy mal", "Mal", "Regular", "Bien", "¡Excelente!"];

export function RateVisit({ refs, initial, businessName }: { refs: { businessId: string; appointmentId: string; token: string }; initial: number; businessName: string }) {
  const [rating, setRating] = useState(initial);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState<null | { reviewUrl: string | null }>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = hover || rating;

  const submit = (stars: number, text: string, el?: Element | null) =>
    start(async () => {
      setError(null);
      const r = await rateVisit(refs, stars, text);
      if (r.error) return setError(r.error);
      setDone({ reviewUrl: r.reviewUrl ?? null });
      if (stars >= 4) confetti(el);
    });

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-6">
        {rating >= 4 ? (
          <>
            <p className="text-lg font-medium">¡Gracias! Nos alegra mucho 💙</p>
            {done.reviewUrl ? (
              <>
                <p className="mt-2 text-ink-2">¿Nos ayudas contándolo en Google? A otras personas les sirve muchísimo.</p>
                <a href={done.reviewUrl} className="btn-cobalt mt-5 w-full">
                  Dejar reseña en Google ⭐
                </a>
              </>
            ) : (
              <p className="mt-2 text-ink-2">Te esperamos pronto en {businessName}.</p>
            )}
          </>
        ) : (
          <>
            <p className="text-lg font-medium">Gracias por contarnos 🙏</p>
            <p className="mt-2 text-ink-2">El equipo de {businessName} ya recibió tu mensaje y lo va a revisar.</p>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex justify-center gap-2" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onMouseEnter={() => setHover(n)}
            onClick={(e) => {
              setRating(n);
              // Happy customers don't need to type anything.
              if (n >= 4) submit(n, "", e.currentTarget);
            }}
            disabled={pending}
            className={clsx(
              "text-[44px] leading-none transition-all duration-300 ease-out hover:scale-125 active:scale-95",
              n <= shown ? "scale-110 text-amber drop-shadow-[0_6px_14px_rgba(233,162,59,.45)]" : "text-line",
            )}
          >
            ★
          </button>
        ))}
      </div>
      <p className="mt-3 h-6 text-sm font-medium text-ink-2" aria-live="polite">
        {LABELS[shown]}
      </p>
      <AnimatePresence>
        {rating > 0 && rating <= 3 && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden text-left"
            onSubmit={(e) => {
              e.preventDefault();
              submit(rating, comment);
            }}
          >
            <label htmlFor="comment" className="label mt-4">
              ¿Qué podemos mejorar?
            </label>
            <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} className="field" placeholder="Cuéntanos qué pasó…" />
            <button type="submit" disabled={pending} className="btn-primary mt-3 w-full">
              {pending ? "Enviando…" : "Enviar"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose">
          {error}
        </p>
      )}
    </div>
  );
}
