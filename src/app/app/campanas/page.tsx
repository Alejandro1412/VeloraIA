import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { inactiveCustomers } from "@/lib/campaigns";
import { whatsappConfigured } from "@/lib/channels/whatsapp";
import { getSettings, listCampaigns, listServices } from "@/lib/data/store";
import { siteUrl } from "@/lib/site";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { CampaignForm } from "@/components/app/CampaignForm";
import { RecallList } from "@/components/app/RecallList";
import { dueRecalls } from "@/lib/recalls";
import Link from "next/link";

const HELP = {
  id: "campanas",
  steps: [
    { title: "Elige a quién", body: "Clientes que no vienen hace 3, 6 o 12 meses y no tienen cita próxima." },
    { title: "Escribe el mensaje", body: "Usa {nombre}, {servicio} y {enlace}; se reemplazan por cada cliente." },
    { title: "Envía", body: "Con WhatsApp conectado sale solo. Si no, te damos un botón por cliente." },
    { title: "Controles automáticos", body: "Arriba: clientes a los que ya les toca volver según cada servicio." },
  ],
};

export default function CampaignsPage({ searchParams }: PageProps<"/app/campanas">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Campaigns searchParams={searchParams} />
    </Suspense>
  );
}

async function Campaigns({ searchParams }: { searchParams: PageProps<"/app/campanas">["searchParams"] }) {
  const session = await requireOwner();
  const q = await searchParams;
  const months = [3, 6, 12].includes(Number(q.meses)) ? Number(q.meses) : 6;
  const serviceId = typeof q.servicio === "string" && q.servicio ? q.servicio : undefined;
  const [settings, services, history, recalls] = await Promise.all([getSettings(), listServices(), listCampaigns(), dueRecalls()]);
  const withRecall = services.filter((s) => (s.recallMonths ?? 0) > 0);
  const names = new Map(services.map((s) => [s.id, s.name]));
  const audience = await inactiveCustomers(months, serviceId, names);
  const live = !session.demo && whatsappConfigured() && !!(settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID);

  return (
    <>
      <PageHeader help={HELP} title="Campañas" description="Recupera a los clientes que dejaron de venir con un mensaje personal por WhatsApp." />
      <div className="px-5 py-6 lg:px-10">
        <section aria-labelledby="recall-title" className="mb-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="recall-title" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
                Próximos controles
                <span className="rounded-full bg-amber-soft px-2.5 py-0.5 font-sans text-sm font-medium text-amber-ink">{recalls.length}</span>
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                Automático: a cada cliente le escribimos cuando le toca volver.{" "}
                {withRecall.length
                  ? `Activo en ${withRecall.map((s) => `${s.name} (cada ${s.recallMonths} m)`).join(", ")}.`
                  : "Aún no hay servicios con control: actívalo en Servicios."}
              </p>
            </div>
            <Link href="/app/servicios" className="btn-ghost btn-sm">
              Configurar en Servicios
            </Link>
          </div>
          <RecallList items={recalls.slice(0, 100)} live={live} demo={session.demo} />
        </section>

        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Campaña a clientes inactivos</h2>
        <CampaignForm
          months={months}
          serviceId={serviceId ?? ""}
          services={services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))}
          audience={audience.slice(0, 300).map((a) => ({ name: a.name, phone: a.phone, lastVisit: a.lastVisit.slice(0, 10), lastService: a.lastService }))}
          live={live}
          business={settings.name}
          link={`${siteUrl()}/reservar/${session.businessId}`}
        />

        <section aria-labelledby="hist-title" className="mt-12">
          <h2 id="hist-title" className="font-display text-xl font-semibold tracking-tight">
            Campañas anteriores
          </h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aún no has enviado campañas.</p>
          ) : (
            <ul className="stagger mt-4 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-paper">
              {history.map((c) => {
                const sent = c.recipients.filter((r) => r.status === "sent").length;
                const manual = c.recipients.filter((r) => r.status === "manual").length;
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className="text-sm text-muted">
                        {new Date(c.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })} · inactivos hace {c.monthsInactive}+ meses
                      </span>
                    </span>
                    <span className="tabular text-sm text-ink-2">
                      {sent ? `${sent} enviados` : ""}
                      {manual ? `${manual} para envío manual` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
