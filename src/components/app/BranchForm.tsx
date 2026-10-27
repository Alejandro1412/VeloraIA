"use client";

import { useActionState } from "react";
import { createBranchAction } from "@/app/app/actions";
import { VERTICALS } from "@/lib/verticals";

export function BranchForm({ defaultVertical, demo }: { defaultVertical: string; demo: boolean }) {
  const [state, action, pending] = useActionState(createBranchAction, null);
  return (
    <form action={action} className="spotlight space-y-4 rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-display text-xl font-semibold tracking-tight">Nueva sede</h2>
      <div>
        <label htmlFor="br-name" className="label">
          Nombre
        </label>
        <input id="br-name" name="name" required placeholder="Ej.: Sonríe · Sede Laureles" className="field" />
      </div>
      <div>
        <label htmlFor="br-vertical" className="label">
          Tipo de negocio
        </label>
        <select id="br-vertical" name="vertical" defaultValue={VERTICALS.includes(defaultVertical) ? defaultVertical : VERTICALS[0]} className="field">
          {VERTICALS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted">
        Tendrá su propia agenda, servicios, equipo, enlace de reservas y número de WhatsApp. Tú entras a todas con la misma cuenta.
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending || demo} className="btn-primary w-full">
        {pending ? "Creando…" : "Crear sede y configurarla"}
      </button>
    </form>
  );
}
