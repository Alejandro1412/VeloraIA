import { Suspense } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { requireOwner } from "@/lib/auth";
import { getSettings, listStaff } from "@/lib/data/store";
import { integrationStatus } from "@/lib/integrations";
import { emailConfigured } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { wompiReady } from "@/lib/wompi";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { SettingsForm } from "@/components/app/SettingsForm";
import { CopyField } from "@/components/app/CopyField";
import { WompiForm } from "@/components/app/WompiForm";
import { createCalendarTokenAction } from "../actions";

const HELP = {
  "id": "ajustes",
  "steps": [
    {
      "title": "Tu negocio",
      "body": "Nombre, teléfono, dirección y horario de atención."
    },
    {
      "title": "Tu recepcionista",
      "body": "Su nombre, saludo e instrucciones especiales."
    },
    {
      "title": "Compártela",
      "body": "Enlace de reservas, botón para tu web y calendario."
    },
    {
      "title": "Cobros",
      "body": "Conecta Wompi para cobrar anticipos."
    }
  ]
};

export default function SettingsPage({ searchParams }: PageProps<"/app/ajustes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings searchParams={searchParams} />
    </Suspense>
  );
}

async function Settings({ searchParams }: { searchParams: PageProps<"/app/ajustes">["searchParams"] }) {
  const session = await requireOwner();
  const [settings, params, staff] = await Promise.all([getSettings(), searchParams, listStaff()]);
  const origin = siteUrl();
  const bookingUrl = `${origin}/reservar/${session.businessId}`;
  const widgetCode = `<script src="${origin}/widget.js" data-business="${session.businessId}" async></script>`;
  const calendarUrl = settings.calendarToken ? `${origin}/api/calendar/${settings.calendarToken}.ics` : null;

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

  // Never send payment secrets to the browser.
  const publicSettings = { ...settings, wompiIntegritySecret: undefined, wompiEventsSecret: undefined };

  return (
    <>
      <PageHeader help={HELP} title="Ajustes" description="Tu negocio, tu recepcionista y cómo te encuentran tus clientes." />
      {welcome && (
        <div className="mx-5 mt-6 rounded-2xl bg-cobalt-soft px-5 py-4 lg:mx-10">
          <p className="font-medium">¡Tu cuenta está lista, {session.name.split(" ")[0]}!</p>
          <p className="mt-1 text-sm text-ink-2">
            Revisa tus horarios y tu dirección, ajusta tus{" "}
            <Link href="/app/servicios" className="text-cobalt hover:underline">
              servicios
            </Link>
            , agrega a tus{" "}
            <Link href="/app/profesionales" className="text-cobalt hover:underline">
              profesionales
            </Link>{" "}
            y comparte tu enlace de reservas. Tienes 14 días gratis con todas las funciones.
          </p>
        </div>
      )}
      <div className="grid gap-12 px-5 py-8 lg:px-10 2xl:grid-cols-[1fr_440px]">
        <div>
          {staff.some((s) => s.active) && (
            <p className="mb-6 rounded-2xl border border-line bg-paper px-5 py-3 text-sm text-ink-2">
              Tienes profesionales configurados: la agenda se calcula por persona y “Citas al mismo tiempo” ya no se usa.
            </p>
          )}
          <SettingsForm settings={publicSettings} demo={session.demo} />
          {!emailConfigured() && settings.notifyEmail && (
            <p className="mt-4 text-sm text-muted">Los avisos por correo se activan cuando IONEX conecte el envío de correos. Mientras tanto los ves en “Avisos”.</p>
          )}
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="link-title" className="spotlight rounded-2xl border border-line bg-paper p-5">
            <h2 id="link-title" className="font-display text-xl font-semibold tracking-tight">
              Tu enlace de reservas
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Compártelo en tu Instagram, en Google Maps o por WhatsApp. Tus clientes agendan ahí con {settings.assistantName}.
            </p>
            <CopyField value={bookingUrl} label="Enlace de reservas" />
            <Link href={`/reservar/${session.businessId}?desde=panel`} className="mt-3 inline-block text-sm font-medium text-cobalt hover:underline">
              Ver mi página de reservas
            </Link>
          </section>

          <section aria-labelledby="widget-title" className="spotlight rounded-2xl border border-line bg-paper p-5">
            <h2 id="widget-title" className="font-display text-xl font-semibold tracking-tight">
              Botón para tu página web
            </h2>
            <p className="mt-1 text-sm text-ink-2">Pega este código antes de &lt;/body&gt; en tu sitio. Aparece un botón “Agenda tu cita” que abre el chat.</p>
            <CopyField value={widgetCode} label="Código del botón" />
          </section>

          <section aria-labelledby="cal-title" className="spotlight rounded-2xl border border-line bg-paper p-5">
            <h2 id="cal-title" className="font-display text-xl font-semibold tracking-tight">
              Ver tus citas en Google Calendar
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              En Google Calendar: <em>Otros calendarios → Desde URL</em> y pega este enlace. Tus citas aparecen solas y se actualizan cada pocas horas.
            </p>
            {calendarUrl ? <CopyField value={calendarUrl} label="Enlace del calendario" /> : null}
            <form action={createCalendarTokenAction} className="mt-3">
              <button type="submit" className="btn-ghost btn-sm" disabled={session.demo}>
                {calendarUrl ? "Crear un enlace nuevo (anula el anterior)" : "Crear enlace de calendario"}
              </button>
            </form>
            {staff.length > 0 && calendarUrl && (
              <p className="mt-3 text-xs text-muted">
                Para el calendario de una sola persona agrega <span className="font-mono">?staff=ID</span>:{" "}
                {staff.map((s) => `${s.name} = ${s.id}`).join(" · ")}
              </p>
            )}
          </section>

          <section aria-labelledby="pay-title" className="spotlight rounded-2xl border border-line bg-paper p-5">
            <h2 id="pay-title" className="font-display text-xl font-semibold tracking-tight">
              Anticipos con Wompi
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Cobra un anticipo al agendar (PSE, Nequi, tarjeta) para que la gente no falte. El dinero llega directo a tu cuenta de Wompi. El valor se
              define en cada{" "}
              <Link href="/app/servicios" className="text-cobalt hover:underline">
                servicio
              </Link>
              .
            </p>
            <WompiForm key={settings.wompiPublicKey ?? "none"} connected={wompiReady(settings)} publicKey={settings.wompiPublicKey ?? ""} webhookUrl={`${origin}/api/wompi/webhook?b=${session.businessId}`} demo={session.demo} />
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
                    <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", i.connected ? "bg-mint-soft text-mint-ink" : "bg-line-soft text-ink-2")}>
                      {i.connected ? "Activo" : "Sin conectar"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{i.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">Para conectar tu WhatsApp o tu línea telefónica, escríbele a IONEX. Para llamadas usamos esta dirección:</p>
            <p className="mt-1 font-mono text-[13px] break-all text-ink-2">
              {origin}/api/voice?b={session.businessId}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
