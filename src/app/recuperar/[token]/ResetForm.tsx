"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "../../login/actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, token), null);
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <div>
        <label htmlFor="password" className="label">
          Nueva contraseña
        </label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
        <p className="mt-1.5 text-xs text-muted">Mínimo 8 caracteres, con letras y números.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Repite la contraseña
        </label>
        <input id="confirm" name="confirm" type="password" required autoComplete="new-password" className="field" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}{" "}
          {state.error.includes("expiró") && (
            <Link href="/recuperar" className="underline">
              Pedir otro enlace
            </Link>
          )}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Guardando…" : "Guardar y entrar"}
      </button>
    </form>
  );
}
