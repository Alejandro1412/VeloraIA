"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { addClosureAction, deleteClosureAction } from "@/app/app/actions";
import type { Closure } from "@/lib/domain/types";
import { formatDateEs } from "@/lib/domain/time";

export function ClosuresEditor({ closures, staff }: { closures: Closure[]; staff: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addClosureAction, null);
  const [removing, startRemove] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = closures.filter((c) => c.to >= today);

  return (
    <section aria-labelledby="closures-title">
      <h2 id="closures-title" className="font-display text-xl font-semibold tracking-tight">
        Días bloqueados
      </h2>
      <p className="mt-1 text-sm text-ink-2">Festivos, vacaciones o un día libre. Sofía no ofrecerá citas en esas fechas.</p>

      <form ref={form} action={action} className="mt-4 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cl-from" className="label">
            Desde
          </label>
          <input id="cl-from" name="from" type="date" min={today} required className="field" />
        </div>
        <div>
          <label htmlFor="cl-to" className="label">
            Hasta (opcional)
          </label>
          <input id="cl-to" name="to" type="date" min={today} className="field" />
        </div>
        <div>
          <label htmlFor="cl-reason" className="label">
            Motivo
          </label>
          <input id="cl-reason" name="reason" placeholder="Festivo, vacaciones…" maxLength={80} className="field" />
        </div>
        <div>
          <label htmlFor="cl-staff" className="label">
            Aplica a
          </label>
          <select id="cl-staff" name="staffId" className="field">
            <option value="">Todo el negocio</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                Solo {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className="btn-primary btn-sm">
            {pending ? "Bloqueando…" : "Bloquear fechas"}
          </button>
          {state?.error && (
            <p role="alert" className="text-sm text-rose">
              {state.error}
            </p>
          )}
        </div>
      </form>

      <ul className="mt-4 divide-y divide-line-soft rounded-2xl border border-line bg-paper">
        {upcoming.length === 0 && <li className="px-5 py-4 text-sm text-muted">No hay fechas bloqueadas próximas.</li>}
        {upcoming.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="font-medium first-letter:uppercase">
                {formatDateEs(c.from)}
                {c.to !== c.from && ` al ${formatDateEs(c.to)}`}
              </p>
              <p className="text-sm text-muted">
                {c.reason}
                {c.staffId ? ` · ${staff.find((s) => s.id === c.staffId)?.name ?? "Profesional"}` : " · Todo el negocio"}
              </p>
            </div>
            <button type="button" disabled={removing} onClick={() => startRemove(() => deleteClosureAction(c.id))} className="btn btn-sm text-rose hover:bg-rose-soft">
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
