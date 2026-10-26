"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";

const OAUTH_ERRORS: Record<string, string> = {
  google_unavailable: "El acceso con Google todavía no está activado.",
  google_cancelled: "Cancelaste el inicio de sesión con Google.",
  google_expired: "El inicio de sesión con Google expiró. Inténtalo de nuevo.",
  google_failed: "Google no pudo confirmar tu cuenta. Inténtalo de nuevo o usa tu correo.",
};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const oauthError = OAUTH_ERRORS[useSearchParams().get("error") ?? ""];
  const error = state?.error ?? oauthError;

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="label">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.fields?.email}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
