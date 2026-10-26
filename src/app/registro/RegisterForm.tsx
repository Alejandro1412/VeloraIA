"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "../login/actions";

const VERTICALS = ["Odontología", "Estética y spa", "Veterinaria", "Fisioterapia", "Barbería y peluquería", "Taller", "Consultorio médico", "Otro"];

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, null);
  const f = state?.fields;

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Tu nombre
          </label>
          <input id="name" name="name" required autoComplete="name" defaultValue={f?.name} className="field" />
        </div>
        <div>
          <label htmlFor="businessName" className="label">
            Nombre del negocio
          </label>
          <input id="businessName" name="businessName" required autoComplete="organization" defaultValue={f?.businessName} className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="vertical" className="label">
          Tipo de negocio
        </label>
        <select id="vertical" name="vertical" defaultValue={f?.vertical || VERTICALS[0]} className="field" key={f?.vertical}>
          {VERTICALS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="email" className="label">
          Correo
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={f?.email} className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="password-hint"
          className="field"
        />
        <p id="password-hint" className="mt-1.5 text-xs text-muted">
          Mínimo 8 caracteres, con letras y números.
        </p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="terms" required defaultChecked={f?.terms === "on"} key={f?.terms} className="mt-0.5 accent-cobalt" />
        <span>
          Acepto la{" "}
          <Link href="/privacidad" className="text-cobalt hover:underline">
            política de tratamiento de datos
          </Link>
          .
        </span>
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creando tu cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
