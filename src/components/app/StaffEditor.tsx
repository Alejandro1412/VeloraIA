"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { clsx } from "clsx";
import { deleteStaffAction, saveStaffAction } from "@/app/app/actions";
import type { Staff } from "@/lib/domain/types";
import { WEEKDAYS_ES } from "@/lib/domain/time";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function StaffEditor({ staff, services }: { staff: Staff[]; services: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(staff.length === 0 ? "new" : null);

  return (
    <section aria-labelledby="staff-title">
      <h2 id="staff-title" className="font-display text-xl font-semibold tracking-tight">
        Equipo que atiende
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        {staff.length === 0
          ? "Sin profesionales, la agenda usa “Citas al mismo tiempo” de Ajustes. Agrega a tu equipo para agendar por persona."
          : "Cada cita queda con un profesional. Puedes cambiarlo desde la agenda."}
      </p>
      <ul className="mt-4 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-paper">
        {staff.map((s) =>
          editing === s.id ? (
            <li key={s.id} className="bg-porcelain/50 p-5">
              <StaffForm staff={s} services={services} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={s.id} className="flex items-center gap-4 px-5 py-4">
              <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={clsx("font-medium", !s.active && "text-muted line-through")}>{s.name}</p>
                <p className="truncate text-sm text-muted">
                  {s.serviceIds.length === 0 ? "Todos los servicios" : s.serviceIds.map((id) => services.find((x) => x.id === id)?.name).filter(Boolean).join(", ")}
                  {s.daysOff.length > 0 && ` · No trabaja ${s.daysOff.map((d) => WEEKDAYS_ES[d]).join(", ")}`}
                </p>
              </div>
              <button type="button" onClick={() => setEditing(s.id)} className="btn-ghost btn-sm">
                Editar
              </button>
            </li>
          ),
        )}
        {editing === "new" && (
          <li className="bg-porcelain/50 p-5">
            <StaffForm services={services} onDone={() => setEditing(null)} />
          </li>
        )}
      </ul>
      {editing !== "new" && (
        <button type="button" onClick={() => setEditing("new")} className="btn-primary btn-sm mt-5">
          Agregar profesional
        </button>
      )}
    </section>
  );
}

function StaffForm({ staff, services, onDone }: { staff?: Staff; services: { id: string; name: string }[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveStaffAction, null);
  const [deleting, startDelete] = useTransition();
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const id = staff?.id ?? "new";

  return (
    <form action={action} className="space-y-5">
      {staff && <input type="hidden" name="id" value={staff.id} />}
      <div>
        <label htmlFor={`${id}-name`} className="label">
          Nombre
        </label>
        <input id={`${id}-name`} name="name" defaultValue={staff?.name} required placeholder="Ej.: Dra. Ana Gómez" className="field" />
      </div>
      <fieldset>
        <legend className="label">Servicios que hace (sin marcar = todos)</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-sm has-[:checked]:border-cobalt has-[:checked]:bg-cobalt-soft">
              <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={staff?.serviceIds.includes(s.id)} className="accent-cobalt" />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Días que no trabaja</legend>
        <div className="flex flex-wrap gap-2">
          {ORDER.map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-sm capitalize has-[:checked]:border-rose has-[:checked]:bg-rose-soft">
              <input type="checkbox" name="daysOff" value={d} defaultChecked={staff?.daysOff.includes(d)} className="accent-rose" />
              {WEEKDAYS_ES[d]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="active" defaultChecked={staff?.active ?? true} className="accent-cobalt" />
          Recibe citas
        </label>
        <div className="flex gap-2">
          {staff && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (confirm(`¿Eliminar a ${staff.name}? Sus citas existentes se conservan sin profesional asignado.`)) startDelete(() => deleteStaffAction(staff.id));
              }}
              className="btn btn-sm text-rose hover:bg-rose-soft"
            >
              Eliminar
            </button>
          )}
          <button type="button" onClick={onDone} className="btn-ghost btn-sm">
            Cancelar
          </button>
          <button type="submit" disabled={pending} className="btn-primary btn-sm">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}
        </p>
      )}
    </form>
  );
}
