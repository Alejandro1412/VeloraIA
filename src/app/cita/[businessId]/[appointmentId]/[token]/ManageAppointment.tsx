"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import type { AppointmentStatus } from "@/lib/domain/types";
import { formatTimeEs } from "@/lib/domain/time";
import { cancelFromLink, confirmFromLink, moveFromLink, slotsFromLink } from "@/app/cita/actions";
import { confetti } from "@/components/fx/confetti";

type Refs = { businessId: string; appointmentId: string; token: string };

export function ManageAppointment({
  refs,
  status: initial,
  past,
  today,
  maxDate,
  initialDate,
  phone,
}: {
  refs: Refs;
  status: AppointmentStatus;
  past: boolean;
  today: string;
  maxDate: string;
  initialDate: string;
  phone: string;
}) {
  const [status, setStatus] = useState(initial);
  const [mode, setMode] = useState<"idle" | "move" | "cancel">("idle");
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (mode !== "move") return;
    let alive = true;
    slotsFromLink(refs, date).then((r) => alive && setSlots(Array.isArray(r) ? r : []));
    return () => {
      alive = false;
    };
  }, [mode, date, refs]);

  if (past || status === "completed" || status === "no_show") {
    return <p className="border-t border-line-soft px-6 py-5 text-sm text-muted">Esta cita ya pasó. ¡Gracias por visitarnos!</p>;
  }
  if (status === "cancelled") {
    return (
      <p className="border-t border-line-soft bg-rose-soft px-6 py-5 text-[15px] text-rose-ink">
        Esta cita está cancelada. Si quieres otra, escríbenos{phone ? ` al ${phone}` : ""}.
      </p>
    );
  }

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>, onOk: () => void) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (r.error) setMsg({ tone: "err", text: r.error });
      else onOk();
    });

  return (
    <div className="border-t border-line-soft px-6 py-5">
      <AnimatePresence mode="wait">
        {msg && (
          <motion.p
            key={msg.text}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className={clsx("mb-4 rounded-2xl px-4 py-3 text-[15px]", msg.tone === "ok" ? "bg-mint-soft text-mint-ink" : "bg-rose-soft text-rose-ink")}
          >
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>

      {status === "confirmed" && mode === "idle" && (
        <p className="mb-4 flex items-center gap-2 text-[15px] text-mint-ink">
          <span className="grid size-6 place-items-center rounded-full bg-mint text-xs text-white">✓</span> Cita confirmada. ¡Te esperamos!
        </p>
      )}

      {mode === "idle" && (
        <div className="grid gap-2 sm:grid-cols-3">
          {status !== "confirmed" && (
            <button
              type="button"
              disabled={pending}
              onClick={(e) => {
                const btn = e.currentTarget;
                run(
                  () => confirmFromLink(refs),
                  () => {
                    setStatus("confirmed");
                    setMsg({ tone: "ok", text: "¡Listo! Confirmaste tu cita." });
                    confetti(btn);
                  },
                );
              }}
              className="btn-cobalt sm:col-span-1"
            >
              Confirmar ✅
            </button>
          )}
          <button type="button" disabled={pending} onClick={() => setMode("move")} className={clsx("btn-ghost", status === "confirmed" && "sm:col-span-2")}>
            Reprogramar
          </button>
          <button type="button" disabled={pending} onClick={() => setMode("cancel")} className="btn text-rose hover:bg-rose-soft">
            Cancelar
          </button>
        </div>
      )}

      {mode === "move" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <label htmlFor="move-date" className="label">
            Elige el nuevo día
          </label>
          <input
            id="move-date"
            type="date"
            min={today}
            max={maxDate}
            value={date}
            onChange={(e) => (setSlots(null), setDate(e.target.value))}
            className="field"
          />
          <p className="mt-4 mb-2 text-sm font-medium text-ink-2">Horarios libres</p>
          {slots === null ? (
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="shimmer h-9 w-20 rounded-full" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">No hay espacio ese día. Prueba otra fecha.</p>
          ) : (
            <div className="stagger flex flex-wrap gap-2">
              {slots.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => moveFromLink(refs, date, t),
                      () => {
                        setMsg({ tone: "ok", text: "¡Hecho! Movimos tu cita. Recarga para ver el nuevo horario." });
                        setMode("idle");
                        setStatus("booked");
                        setTimeout(() => location.reload(), 1200);
                      },
                    )
                  }
                  className="tabular rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm transition-all hover:-translate-y-0.5 hover:border-cobalt hover:text-cobalt"
                >
                  {formatTimeEs(t)}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setMode("idle")} className="mt-5 text-sm text-muted hover:text-ink">
            ← Volver
          </button>
        </motion.div>
      )}

      {mode === "cancel" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[15px]">¿Seguro que quieres cancelar? El espacio quedará libre para otra persona.</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelFromLink(refs),
                  () => {
                    setStatus("cancelled");
                  },
                )
              }
              className="btn bg-rose text-white hover:brightness-110"
            >
              Sí, cancelar
            </button>
            <button type="button" onClick={() => setMode("idle")} className="btn-ghost">
              No, mantenerla
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
