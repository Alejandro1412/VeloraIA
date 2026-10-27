"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "../../login/actions";

export function JoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction.bind(null, token), null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="label">
          Tu nombre
        </label>
        <input id="name" name="name" required autoComplete="name" defaultValue={state?.fields?.name} className="field" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Correo
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.fields?.email} className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
        <p className="mt-1.5 text-xs text-muted">Mínimo 8 caracteres, con letras y números.</p>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creando tu acceso…" : "Unirme al equipo"}
      </button>
    </form>
  );
}
