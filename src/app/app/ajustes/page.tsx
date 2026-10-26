import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { clsx } from "clsx";
import { requireSession } from "@/lib/auth";
import { getSettings } from "@/lib/data/store";
import { integrationStatus } from "@/lib/integrations";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { SettingsForm } from "@/components/app/SettingsForm";
import { CopyField } from "@/components/app/CopyField";

export default function SettingsPage({ searchParams }: PageProps<"/app/ajustes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings searchParams={searchParams} />
    </Suspense>
  );
}

async function Settings({ searchParams }: { searchParams: PageProps<"/app/ajustes">["searchParams"] }) {
  const session = await requireSession();
  const [settings, params, h] = await Promise.all([getSettings(), searchParams, headers()]);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const bookingUrl = `${origin}/reservar/${session.businessId}`;
  // Owner-facing wording: the technical setup is IONEX's job, not the business'.
  const ownerText: Record<string, [on: string, off: string]> = {
    ai: ["Conversaciones naturales con IA avanzada.", "Sofía responde con su motor en español. La IA avanzada se activa con el plan Profesional."],
    whatsapp: ["Tu número de WhatsApp Business está conectado.", "IONEX conecta tu número de WhatsApp Business para atender a tus clientes ahí."],
    voice: ["Sofía contesta las llamadas de tu línea.", "Disponible en el plan Profesional: Sofía contesta tu línea telefónica."],
    cron: ["Se envían recordatorios por WhatsApp antes de cada cita.", "Se activan junto con tu WhatsApp Business."],
  };
  const integrations = integrationStatus()
    .filter((i) => i.key in ownerText)
    .map((i) => ({ ...i, detail: ownerText[i.key][i.connected ? 0 : 1] }));
  const welcome = params.bienvenida === "1";

  return (
    <>
      <PageHeader title="Ajustes" description="Tu negocio, tu recepcionista y cómo te encuentran tus clientes." />
      {welcome && (
        <div className="mx-5 mt-6 rounded-2xl bg-cobalt-soft px-5 py-4 lg:mx-10">
          <p className="font-medium">¡Tu cuenta está lista, {session.name.split(" ")[0]}!</p>
          <p className="mt-1 text-sm text-ink-2">
            Revisa tus horarios y tu dirección, ajusta tus{" "}
            <Link href="/app/servicios" className="text-cobalt hover:underline">
              servicios
            </Link>{" "}
            y comparte tu enlace de reservas. Sofía empieza a agendar con eso.
          </p>
        </div>
      )}
      <div className="grid gap-12 px-5 py-8 lg:px-10 2xl:grid-cols-[1fr_420px]">
        <SettingsForm settings={settings} demo={session.demo} />

        <aside className="space-y-6">
          <section aria-labelledby="link-title" className="rounded-2xl border border-line bg-paper p-5">
            <h2 id="link-title" className="font-display text-xl font-semibold tracking-tight">
              Tu enlace de reservas
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Compártelo en tu Instagram, en Google Maps o por WhatsApp. Tus clientes agendan ahí con {settings.assistantName}.
            </p>
            <CopyField value={bookingUrl} label="Enlace de reservas" />
            <a href={bookingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-cobalt hover:underline">
              Abrir mi página de reservas
            </a>
          </section>

          <section aria-labelledby="int-title">
            <h2 id="int-title" className="font-display text-xl font-semibold tracking-tight">
              Canales
            </h2>
            <ul className="mt-3 divide-y divide-line-soft rounded-2xl border border-line bg-paper">
              {integrations.map((i) => (
                <li key={i.key} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{i.name}</p>
                    <span
                      className={clsx(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        i.connected ? "bg-mint-soft text-[#0b7a5b]" : "bg-line-soft text-ink-2",
                      )}
                    >
                      {i.connected ? "Activo" : "Sin conectar"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{i.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Para conectar tu WhatsApp o tu línea telefónica, escríbele a IONEX. Para llamadas usamos esta dirección:
            </p>
            <p className="mt-1 font-mono text-[13px] break-all text-ink-2">
              {origin}/api/voice?b={session.businessId}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
