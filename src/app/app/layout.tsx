import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { Sidebar } from "@/components/app/Sidebar";
import { getSession } from "@/lib/auth";
import { getBusiness } from "@/lib/accounts";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <Link href="/" className="lg:px-2" aria-label="Velora, sitio público">
          <Logo />
        </Link>
        <Sidebar />
        <div className="flex items-center gap-2 lg:mt-auto lg:block">
          <Suspense fallback={<div className="hidden h-14 lg:block" />}>
            <Account />
          </Suspense>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-porcelain hover:text-ink lg:w-full lg:py-2.5 lg:text-left lg:text-[15px]"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 pb-24 lg:pb-0">
        <Suspense>
          <DemoBanner />
        </Suspense>
        {children}
      </div>
    </div>
  );
}

async function Account() {
  const session = await getSession();
  if (!session) return null;
  const business = session.demo ? null : await getBusiness(session.businessId);
  return (
    <div className="hidden min-w-0 border-t border-line px-3 pt-4 pb-2 lg:block">
      <p className="truncate text-sm font-medium">{session.demo ? "Modo demostración" : session.name}</p>
      <p className="truncate text-xs text-muted">{session.demo ? "Clínica Dental Sonríe" : (business?.name ?? session.email)}</p>
    </div>
  );
}

async function DemoBanner() {
  const session = await getSession();
  if (!session?.demo) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-2.5 text-sm text-white lg:px-10">
      <p>Estás viendo una clínica de demostración. Los cambios los ven también otros visitantes.</p>
      <Link href="/registro" className="font-medium text-white underline underline-offset-4">
        Crear la cuenta de mi negocio
      </Link>
    </div>
  );
}
