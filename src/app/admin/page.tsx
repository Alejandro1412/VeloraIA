import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminOverview, requireAdmin } from "@/lib/admin";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { CountUp } from "@/components/fx/CountUp";
import { PageSkeleton } from "@/components/app/ui";
import { AdminTable } from "./AdminTable";

export const metadata: Metadata = { title: "IONEX · Administración", robots: { index: false } };

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Admin />
    </Suspense>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

async function Admin() {
  const session = await requireAdmin();
  const { rows, totals } = await adminOverview();
  const kpis = [
    { label: "Ingreso mensual (MRR)", value: money(totals.mrr), hint: `${money(totals.mrr * 12)} al año` },
    { label: "Negocios pagando", value: String(totals.paying), hint: `de ${totals.businesses} registrados` },
    { label: "En prueba", value: String(totals.trials), hint: `${totals.newThisMonth} nuevos este mes` },
    { label: "Vencen en 7 días", value: String(totals.expiringSoon), hint: "para llamar hoy" },
    { label: "En riesgo", value: String(totals.atRisk), hint: "sin entrar hace 7+ días" },
    { label: "Citas (30 días)", value: String(totals.appointments30), hint: "en todos los negocios" },
  ];

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-paper px-5 py-3 lg:px-10">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-night px-2.5 py-0.5 text-xs font-semibold text-white">IONEX</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/app" className="btn-ghost btn-sm">
            Ir a mi panel
          </Link>
        </div>
      </header>

      <div className="px-5 py-8 lg:px-10">
        <p className="text-sm text-muted">Hola {session.name.split(" ")[0]} · Administración de Velora</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.035em]">Tus clientes</h1>

        <dl className="stagger mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k, i) => (
            <div key={k.label} className={`spotlight rounded-2xl border border-line p-4 ${i === 0 ? "bg-night text-white" : "bg-paper"}`}>
              <dt className={`text-sm ${i === 0 ? "text-white/70" : "text-muted"}`}>{k.label}</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold tracking-[-0.03em]">
                <CountUp value={k.value} />
              </dd>
              <dd className={`mt-1 text-xs ${i === 0 ? "text-white/60" : "text-muted"}`}>{k.hint}</dd>
            </div>
          ))}
        </dl>

        <AdminTable rows={rows} />
      </div>
    </main>
  );
}
