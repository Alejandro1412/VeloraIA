import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { BackButton } from "../app/PageChrome";
import { ThemeToggle } from "../fx/ThemeToggle";

/** Two-column frame shared by the sign-in and sign-up pages. */
export function AuthShell({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_0.95fr]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Volver al inicio" className="w-fit">
            <Logo showByline />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <div className="mb-6">
            <BackButton fallback="/" />
          </div>
          <div className="animate-[rise_800ms_var(--ease-out-expo)_both]">{children}</div>
        </div>
        <p className="text-sm text-muted">
          Un producto de IONEX ·{" "}
          <Link href="/privacidad" className="hover:text-ink">
            Tratamiento de datos
          </Link>
        </p>
      </section>
      <aside aria-hidden className="relative hidden overflow-hidden bg-night p-10 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute inset-0 grid grid-cols-6 content-start gap-3 p-10 opacity-90">
          {Array.from({ length: 42 }, (_, i) => {
            const kinds = ["bg-white/5", "bg-cobalt", "bg-white/5", "bg-mint", "bg-white/10", "bg-white/5", "bg-cobalt/70"];
            return (
              <div
                key={i}
                className={`h-14 animate-[tile_6s_ease-in-out_infinite] rounded-xl ${kinds[(i * 7 + (i % 5)) % kinds.length]}`}
                style={{ animationDelay: `${((i * 37) % 23) * 0.25}s` }}
              />
            );
          })}
        </div>
        <div className="relative animate-[rise_1000ms_var(--ease-out-expo)_300ms_both] rounded-3xl bg-paper p-8 text-ink shadow-2xl">{aside}</div>
      </aside>
    </main>
  );
}

export function GoogleButton({
  enabled,
  label = "Continuar con Google",
  href = "/api/auth/google",
}: {
  enabled: boolean;
  label?: string;
  href?: string;
}) {
  const icon = (
    <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
  if (!enabled) {
    return (
      <div>
        <button type="button" disabled className="btn-ghost w-full bg-paper">
          {icon}
          {label}
        </button>
        <p className="mt-2 text-center text-xs text-muted">El acceso con Google se activa en cuanto IONEX lo configure.</p>
      </div>
    );
  }
  return (
    // A plain link: the OAuth flow is a full-page redirect, not a client fetch.
    <a href={href} className="btn-ghost w-full bg-paper hover:shadow-[0_10px_30px_-14px_var(--color-cobalt)]">
      {icon}
      {label}
    </a>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-4 text-sm text-muted">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
