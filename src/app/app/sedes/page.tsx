import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { getBusiness, getUser, userBusinesses } from "@/lib/accounts";
import { subscriptionFor, PLANS } from "@/lib/billing";
import { getSettings, listAppointments } from "@/lib/data/store";
import { withBusiness } from "@/lib/tenant";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { BranchForm } from "@/components/app/BranchForm";
import { SwitchButton } from "@/components/app/SwitchButton";

const HELP = {
  id: "sedes",
  steps: [
    { title: "Una cuenta, varias sedes", body: "Cada sede tiene su agenda, servicios, equipo y WhatsApp." },
    { title: "Cambia en un clic", body: "Abajo a la izquierda, toca tu nombre para saltar de sede." },
    { title: "Compara", body: "Aquí ves las citas de cada sede en los últimos 30 días." },
    { title: "Plan Sedes", body: "Ideal para cadenas: conversaciones ilimitadas y hasta 50 profesionales." },
  ],
};

export default function BranchesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Branches />
    </Suspense>
  );
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function Branches() {
  const session = await requireOwner();
  const user = session.demo ? null : await getUser(session.userId);
  const access = user ? userBusinesses(user) : [{ businessId: session.businessId, role: session.role }];
  const since = daysAgo(30);
  const rows = await Promise.all(
    access.map(async (m) => {
      const b = session.demo ? null : await getBusiness(m.businessId);
      const data = await withBusiness(m.businessId, async () => ({ settings: await getSettings(), apts: await listAppointments({ from: since }) }));
      const sub = b ? subscriptionFor(b) : null;
      return {
        id: m.businessId,
        name: b?.name ?? data.settings.name,
        address: data.settings.address,
        vertical: data.settings.vertical,
        appointments: data.apts.filter((a) => a.status !== "cancelled").length,
        plan: sub ? (sub.trial ? "Prueba" : PLANS[sub.plan].name) : "Demostración",
        current: m.businessId === session.businessId,
      };
    }),
  );
  const max = Math.max(1, ...rows.map((r) => r.appointments));
  const vertical = rows.find((r) => r.current)?.vertical ?? "";

  return (
    <>
      <PageHeader help={HELP} title="Sedes" description="Maneja todas tus sedes desde una sola cuenta." />
      <div className="grid gap-8 px-5 py-6 lg:px-10 xl:grid-cols-[1.4fr_1fr]">
        <ul className="stagger space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="spotlight rounded-2xl border border-line bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-semibold tracking-tight">
                    {r.name}
                    {r.current && <span className="ml-2 rounded-full bg-mint-soft px-2 py-0.5 align-middle text-xs font-medium text-mint-ink">Estás aquí</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {r.vertical}
                    {r.address ? ` · ${r.address}` : ""} · {r.plan}
                  </p>
                </div>
                {!r.current && <SwitchButton businessId={r.id} />}
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                  <span
                    className="block h-full origin-left animate-[grow-x_1000ms_var(--ease-out-expo)_both] rounded-full bg-gradient-to-r from-cobalt to-mint"
                    style={{ width: `${(r.appointments / max) * 100}%` }}
                  />
                </span>
                <span className="tabular w-28 text-right text-ink-2">{r.appointments} citas · 30 d</span>
              </div>
            </li>
          ))}
        </ul>
        <BranchForm defaultVertical={vertical} demo={session.demo} />
      </div>
    </>
  );
}
