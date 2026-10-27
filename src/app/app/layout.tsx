import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { Sidebar } from "@/components/app/Sidebar";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { getSession } from "@/lib/auth";
import { getBusiness } from "@/lib/accounts";
import { subscriptionFor } from "@/lib/billing";
import { listNotifications } from "@/lib/data/store";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <Link href="/" className="lg:px-2" aria-label="Velora, sitio público">
          <Logo />
        </Link>
        <Suspense fallback={<Sidebar role="staff" />}>
          <Nav />
        </Suspense>
        <div className="hidden lg:mt-auto lg:block lg:pt-6">
          <ThemeToggle label />
          <Suspense fallback={<div className="h-14" />}>
            <Account />
          </Suspense>
          <form action={logoutAction}>
            <button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left text-[15px] text-muted hover:bg-porcelain hover:text-ink">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 pb-24 lg:pb-0">
        <Suspense>
          <Banners />
        </Suspense>
        {children}
      </div>
    </div>
  );
}

async function Nav() {
  const session = await getSession();
  if (!session) return <Sidebar role="staff" />;
  const unread = (await listNotifications(100)).filter((n) => !n.read).length;
  return <Sidebar role={session.role} unread={unread} />;
}

async function Account() {
  const session = await getSession();
  if (!session) return null;
  const business = session.demo ? null : await getBusiness(session.businessId);
  return (
    <div className="min-w-0 border-t border-line px-3 pt-4 pb-2">
      <p className="truncate text-sm font-medium">{session.demo ? "Modo demostración" : session.name}</p>
      <p className="truncate text-xs text-muted">
        {session.demo ? "Clínica Dental Sonríe" : (business?.name ?? session.email)}
        {session.role === "staff" ? " · Equipo" : ""}
      </p>
    </div>
  );
}

async function Banners() {
  const session = await getSession();
  if (!session) return null;
  if (session.demo) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-night px-5 py-2.5 text-sm text-white lg:px-10">
        <p>Estás viendo una clínica de demostración. Los cambios los ven también otros visitantes.</p>
        <Link href="/registro" className="font-medium text-white underline underline-offset-4">
          Crear la cuenta de mi negocio
        </Link>
      </div>
    );
  }
  const business = await getBusiness(session.businessId);
  if (!business) return null;
  const sub = subscriptionFor(business);
  if (sub.daysLeft > 5) return null;
  const tone = sub.serving ? (sub.daysLeft >= 0 ? "bg-amber-soft text-ink" : "bg-rose-soft text-ink") : "bg-rose text-white";
  const message = !sub.serving
    ? "Tu agenda en línea está pausada: Sofía no está agendando. Activa tu plan para reanudarla."
    : sub.daysLeft >= 0
      ? `${sub.trial ? "Tu prueba gratis" : "Tu plan"} termina en ${sub.daysLeft} ${sub.daysLeft === 1 ? "día" : "días"}.`
      : `Tu plan venció. Sofía seguirá agendando ${sub.daysLeft + 5} ${sub.daysLeft + 5 === 1 ? "día" : "días"} más.`;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm lg:px-10 ${tone}`}>
      <p>{message}</p>
      {session.role === "owner" && (
        <Link href="/app/plan" className="font-medium underline underline-offset-4">
          Ver planes
        </Link>
      )}
    </div>
  );
}
