import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, Divider, GoogleButton } from "@/components/auth/AuthShell";
import { googleConfigured } from "@/lib/google";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea la recepcionista con IA de tu negocio en minutos.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      aside={
        <>
          <p className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">
            Tu recepcionista queda lista hoy.
          </p>
          <ul className="mt-5 space-y-2.5 text-[15px] text-ink-2">
            <li>Agenda con tus servicios, horarios y pausas.</li>
            <li>Un enlace de reservas propio para compartir.</li>
            <li>Panel con tu agenda y tus conversaciones.</li>
          </ul>
        </>
      }
    >
      <h1 className="font-display text-4xl font-semibold tracking-[-0.035em]">Crea tu cuenta</h1>
      <p className="mt-3 text-ink-2">
        ¿Ya tienes una?{" "}
        <Link href="/login" className="font-medium text-cobalt hover:underline">
          Inicia sesión
        </Link>
      </p>

      <div className="mt-8">
        <GoogleButton enabled={googleConfigured()} label="Registrarme con Google" />
      </div>
      <Divider>o con tu correo</Divider>
      <Suspense fallback={<div className="shimmer h-96 rounded-2xl" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
