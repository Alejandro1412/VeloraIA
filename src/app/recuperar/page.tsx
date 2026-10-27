import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell
      aside={
        <p className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">
          Tu agenda sigue funcionando mientras recuperas tu acceso.
        </p>
      }
    >
      <h1 className="font-display text-4xl font-semibold tracking-[-0.035em]">Recupera tu contraseña</h1>
      <p className="mt-3 text-ink-2">Te enviamos un enlace a tu correo para crear una nueva.</p>
      <ForgotForm />
      <p className="mt-8 text-sm text-ink-2">
        ¿La recordaste?{" "}
        <Link href="/login" className="font-medium text-cobalt hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
