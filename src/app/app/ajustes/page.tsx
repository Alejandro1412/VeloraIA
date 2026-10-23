import { Suspense } from "react";
import { headers } from "next/headers";
import { clsx } from "clsx";
import { requireSession } from "@/lib/auth";
import { getSettings } from "@/lib/data/store";
import { integrationStatus } from "@/lib/integrations";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { SettingsForm } from "@/components/app/SettingsForm";
import { logoutAction } from "../actions";

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await requireSession();
  const settings = await getSettings();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const integrations = integrationStatus();

  return (
    <>
      <PageHeader title="Ajustes" description="Tu negocio, tu recepcionista y las conexiones." />
      <div className="grid gap-12 px-5 py-8 lg:px-10 2xl:grid-cols-[1fr_420px]">
        <SettingsForm settings={settings} />

        <aside aria-labelledby="int-title" className="space-y-6">
          <div>
            <h2 id="int-title" className="font-display text-xl font-semibold tracking-tight">
              Conexiones
            </h2>
            <p className="mt-1 text-sm text-ink-2">Se activan con variables de entorno en Vercel. Ver el archivo README del proyecto.</p>
          </div>
          <ul className="divide-y divide-line-soft rounded-2xl border border-line bg-paper">
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
                {!i.connected && <p className="mt-2 text-xs break-all text-muted">{i.env.join(" · ")}</p>}
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-line bg-paper p-5 text-sm">
            <p className="font-medium">Direcciones para conectar</p>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-muted">Webhook de WhatsApp (Meta)</dt>
                <dd className="mt-0.5 font-mono text-[13px] break-all">{origin}/api/whatsapp/webhook</dd>
              </div>
              <div>
                <dt className="text-muted">Llamadas entrantes (Twilio)</dt>
                <dd className="mt-0.5 font-mono text-[13px] break-all">{origin}/api/voice</dd>
              </div>
              <div>
                <dt className="text-muted">Chat web (API)</dt>
                <dd className="mt-0.5 font-mono text-[13px] break-all">{origin}/api/chat</dd>
              </div>
            </dl>
          </div>

          <form action={logoutAction}>
            <button type="submit" className="btn-ghost btn-sm">
              Cerrar sesión
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
