import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { isDemoAuth, DEMO_PASSWORD } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar al panel", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12">
        <Link href="/" aria-label="Volver al inicio" className="w-fit">
          <Logo showByline />
        </Link>
        <div className="mx-auto w-full max-w-sm py-16">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.035em]">Entra a tu recepción</h1>
          <p className="mt-3 text-ink-2">Agenda, conversaciones y ajustes de tu negocio.</p>
          <LoginForm />
          {isDemoAuth() && (
            <p className="mt-6 rounded-2xl bg-cobalt-soft px-4 py-3 text-sm text-ink-2">
              Esta es la clínica de demostración. La contraseña es{" "}
              <span className="font-semibold text-ink">{DEMO_PASSWORD}</span>.
            </p>
          )}
        </div>
        <p className="text-sm text-muted">Un producto de IONEX</p>
      </section>
      <section aria-hidden className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 grid grid-cols-6 gap-3 p-10 opacity-90">
          {Array.from({ length: 48 }, (_, i) => {
            const kinds = ["bg-white/5", "bg-cobalt", "bg-white/5", "bg-mint", "bg-white/10", "bg-white/5", "bg-cobalt/70"];
            return <div key={i} className={`rounded-xl ${kinds[(i * 7 + (i % 5)) % kinds.length]}`} />;
          })}
        </div>
        <div className="absolute inset-x-10 bottom-10 rounded-3xl bg-paper p-8 text-ink">
          <p className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">
            Cada cuadro es una cita que llegó mientras el consultorio estaba cerrado.
          </p>
        </div>
      </section>
    </main>
  );
}
