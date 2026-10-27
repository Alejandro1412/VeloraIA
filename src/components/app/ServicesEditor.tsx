"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { clsx } from "clsx";
import { deleteServiceAction, saveServiceAction } from "@/app/app/actions";
import { formatMoney } from "@/lib/domain/time";
import type { Service } from "@/lib/domain/types";

export function ServicesEditor({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="px-5 py-6 lg:px-10">
      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <ul className="divide-y divide-line-soft">
          {services.map((s) =>
            editing === s.id ? (
              <li key={s.id} className="bg-porcelain/50 p-5">
                <ServiceForm service={s} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={s.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_120px_140px_auto] sm:items-center sm:gap-6">
                <div className="min-w-0">
                  <p className={clsx("font-medium", !s.active && "text-muted line-through")}>{s.name}</p>
                  <p className="truncate text-sm text-muted">{s.description || "Sin descripción"}</p>
                  {(!!s.depositAmount || !!s.bufferMinutes || !!s.days?.length || (s.sessions ?? 1) > 1 || !!s.recallMonths) && (
                    <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      {!!s.depositAmount && <span className="rounded-full bg-mint-soft px-2 py-0.5 text-mint-ink">Anticipo {formatMoney(s.depositAmount)}</span>}
                      {(s.sessions ?? 1) > 1 && <span className="rounded-full bg-cobalt-soft px-2 py-0.5 text-cobalt">Paquete de {s.sessions} sesiones</span>}
                      {!!s.recallMonths && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-amber-ink">Control cada {s.recallMonths} m</span>}
                      {!!s.bufferMinutes && <span className="rounded-full bg-line-soft px-2 py-0.5 text-ink-2">+{s.bufferMinutes} min descanso</span>}
                      {!!s.days?.length && (
                        <span className="rounded-full bg-line-soft px-2 py-0.5 text-ink-2">{DAYS.filter(([d]) => s.days!.includes(d)).map(([, l]) => l).join(" · ")}</span>
                      )}
                    </p>
                  )}
                </div>
                <p className="tabular text-sm text-ink-2">{s.durationMinutes} min</p>
                <p className="tabular text-sm text-ink-2">{formatMoney(s.price)}</p>
                <button type="button" onClick={() => setEditing(s.id)} className="btn-ghost btn-sm justify-self-start">
                  Editar
                </button>
              </li>
            ),
          )}
          {editing === "new" && (
            <li className="bg-porcelain/50 p-5">
              <ServiceForm onDone={() => setEditing(null)} />
            </li>
          )}
        </ul>
      </div>
      {editing !== "new" && (
        <button type="button" onClick={() => setEditing("new")} className="btn-primary btn-sm mt-5">
          Agregar servicio
        </button>
      )}
    </div>
  );
}

const DAYS: [number, string][] = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mié"],
  [4, "Jue"],
  [5, "Vie"],
  [6, "Sáb"],
  [0, "Dom"],
];

function ServiceForm({ service, onDone }: { service?: Service; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveServiceAction, null);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const id = service?.id ?? "new";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-4">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-name`} className="label">
          Nombre
        </label>
        <input id={`${id}-name`} name="name" defaultValue={service?.name} required className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-dur`} className="label">
          Duración (min)
        </label>
        <input id={`${id}-dur`} name="durationMinutes" type="number" min={5} step={5} defaultValue={service?.durationMinutes ?? 30} required className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-price`} className="label">
          Precio (COP)
        </label>
        <input id={`${id}-price`} name="price" type="number" min={0} step={1000} defaultValue={service?.price ?? 0} required className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-desc`} className="label">
          Descripción corta
        </label>
        <input id={`${id}-desc`} name="description" defaultValue={service?.description} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-kw`} className="label">
          Palabras clave, separadas por comas
        </label>
        <input id={`${id}-kw`} name="keywords" defaultValue={service?.keywords.join(", ")} placeholder="limpieza, sarro, profilaxis" className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-buf`} className="label">
          Descanso después (min)
        </label>
        <input id={`${id}-buf`} name="bufferMinutes" type="number" min={0} max={240} step={5} defaultValue={service?.bufferMinutes ?? 0} className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-dep`} className="label">
          Anticipo (COP)
        </label>
        <input id={`${id}-dep`} name="depositAmount" type="number" min={0} step={1000} defaultValue={service?.depositAmount ?? 0} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-recall`} className="label">
          Volver a contactar en (meses)
        </label>
        <select id={`${id}-recall`} name="recallMonths" defaultValue={service?.recallMonths ?? 0} className="field">
          <option value={0}>No enviar recordatorio de control</option>
          {[1, 2, 3, 4, 6, 9, 12, 18, 24].map((m) => (
            <option key={m} value={m}>
              {m} {m === 1 ? "mes" : "meses"} después de atendido
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-ses`} className="label">
          Sesiones del paquete
        </label>
        <input id={`${id}-ses`} name="sessions" type="number" min={1} max={52} defaultValue={service?.sessions ?? 1} className="field" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="label">Días en que se ofrece</legend>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="checkbox"
                name="days"
                value={value}
                defaultChecked={!service?.days?.length || service.days.includes(value)}
                className="peer sr-only"
              />
              <span className="inline-grid h-9 min-w-11 place-items-center rounded-full border border-line px-3 text-sm text-ink-2 peer-checked:border-ink peer-checked:bg-night peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted sm:col-span-4">
        El anticipo se cobra con Wompi al agendar (conéctalo en Ajustes); con 0 no se cobra. El descanso bloquea tiempo para limpiar o preparar entre citas. Con un paquete de varias sesiones, al agendar desde la agenda se proponen todas de una vez.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-4">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="accent-cobalt" />
          Disponible para agendar
        </label>
        <div className="flex gap-2">
          {service && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (confirm(`¿Eliminar “${service.name}”? Las citas existentes se conservan.`)) startDelete(() => deleteServiceAction(service.id));
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
            {pending ? "Guardando…" : "Guardar servicio"}
          </button>
        </div>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose sm:col-span-4">
          {state.error}
        </p>
      )}
    </form>
  );
}
