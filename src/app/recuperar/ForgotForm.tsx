"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "../login/actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  if (state?.sent) {
    return (
      <p role="status" className="mt-8 rounded-2xl bg-mint-soft px-5 py-4 text-[15px] text-ink">
        Si existe una cuenta con ese correo, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.
      </p>
    );
  }
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="label">
          Correo de tu cuenta
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}
