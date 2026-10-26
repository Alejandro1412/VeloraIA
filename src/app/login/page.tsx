import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, Divider, GoogleButton } from "@/components/auth/AuthShell";
import { googleConfigured } from "@/lib/google";
import { LoginForm } from "./LoginForm";
import { demoAction } from "./actions";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell
      aside={
        <p className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">
          Cada cuadro es una cita que llegó mientras tu negocio estaba cerrado.
        </p>
      }
    >
      <h1 className="font-display text-4xl font-semibold tracking-[-0.035em]">Entra a tu recepción</h1>
      <p className="mt-3 text-ink-2">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-cobalt hover:underline">
          Crea una gratis
        </Link>
      </p>

      <div className="mt-8">
        <GoogleButton enabled={googleConfigured()} />
      </div>
      <Divider>o con tu correo</Divider>
      <Suspense>
        <LoginForm />
      </Suspense>

      <form action={demoAction} className="mt-8 rounded-2xl bg-cobalt-soft px-5 py-4">
        <p className="text-sm text-ink-2">¿Solo quieres mirar? Entra a la clínica de demostración, sin crear cuenta.</p>
        <button type="submit" className="mt-3 text-sm font-medium text-cobalt hover:underline">
          Ver la demo del panel
        </button>
      </form>
    </AuthShell>
  );
}
