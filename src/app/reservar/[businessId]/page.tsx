import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { BackButton } from "@/components/app/PageChrome";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { chatSuggestions } from "@/lib/suggestions";
import { LogoMark } from "@/components/brand/Logo";
import { getBusiness } from "@/lib/accounts";
import { getSettings, listServices } from "@/lib/data/store";
import { formatMoney, formatTimeEs, WEEKDAYS_ES } from "@/lib/domain/time";
import { DEMO_BUSINESS_ID, isValidBusinessId, withBusiness } from "@/lib/tenant";

/** Public booking page each business shares with its customers. */

async function load(businessId: string) {
  if (!isValidBusinessId(businessId)) return null;
  if (businessId !== DEMO_BUSINESS_ID && !(await getBusiness(businessId))) return null;
  return withBusiness(businessId, async () => ({
    settings: await getSettings(),
    services: await listServices({ activeOnly: true }),
  }));
}

export async function generateMetadata({ params }: PageProps<"/reservar/[businessId]">): Promise<Metadata> {
  const data = await load((await params).businessId);
  if (!data) return { title: "Reservas" };
  return {
    title: `Reserva en ${data.settings.name}`,
    description: `Agenda tu cita en ${data.settings.name} en segundos, a cualquier hora.`,
  };
}

export default function BookingPage({ params, searchParams }: PageProps<"/reservar/[businessId]">) {
  return (
    <main className="min-h-dvh">
      <Suspense fallback={<div className="mx-auto h-dvh max-w-[1100px] animate-pulse px-5 py-10" />}>
        <Booking params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const PAYMENT_NOTICE: Record<string, string> = {
  enviado: "Recibimos tu pago. En cuanto Wompi lo confirme, tu cita quedará asegurada.",
  listo: "Este anticipo ya está pagado. ¡Te esperamos!",
  "no-disponible": "Este enlace de pago ya no está disponible. Escríbenos para ayudarte.",
};

async function Booking({
  params,
  searchParams,
}: {
  params: PageProps<"/reservar/[businessId]">["params"];
  searchParams: PageProps<"/reservar/[businessId]">["searchParams"];
}) {
  const [{ businessId }, query] = await Promise.all([params, searchParams]);
  const data = await load(businessId);
  if (!data) notFound();
  const { settings, services } = data;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const notice = typeof query.pago === "string" ? PAYMENT_NOTICE[query.pago] : undefined;
  const chat = (
    <ChatWidget
      businessId={businessId}
      greeting={settings.welcomeMessage}
      assistantName={settings.assistantName}
      bookedNote={`Tu cita quedó registrada en la agenda de ${settings.name}.`}
      suggestions={chatSuggestions(services)}
    />
  );

  // Embedded in a business website through /widget.js: just the chat.
  if (query.embed === "1") return <div className="h-dvh [&>div]:rounded-none [&>div]:border-0">{chat}</div>;

  return (
    <div className="mx-auto grid max-w-[1100px] gap-10 px-5 py-8 sm:py-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
      <div className="flex items-center justify-between lg:col-span-2">
        {query.desde === "panel" ? <BackButton fallback="/app/ajustes" label="Volver al panel" /> : <BackButton fallback="/" />}
        <ThemeToggle />
      </div>
      <section className="animate-[rise_800ms_var(--ease-out-expo)_both] lg:pt-2">
        {notice && <p role="status" className="mb-6 rounded-2xl bg-mint-soft px-4 py-3 text-[15px]">{notice}</p>}
        <p className="text-sm text-muted">{settings.vertical}</p>
        <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em]">{settings.name}</h1>
        <p className="mt-4 max-w-sm text-lg text-ink-2">Agenda, mueve o cancela tu cita escribiéndole a {settings.assistantName}. Responde al instante.</p>

        {services.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-ink-2">Servicios</h2>
            <ul className="mt-3 divide-y divide-line-soft rounded-2xl border border-line bg-paper">
              {services.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-4 px-4 py-3 text-[15px] transition-colors hover:bg-porcelain/60">
                  <span>
                    {s.name} <span className="text-sm text-muted">· {s.durationMinutes} min</span>
                  </span>
                  <span className="tabular shrink-0 text-ink-2">{formatMoney(s.price, settings.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="mt-8 grid grid-cols-[96px_1fr] gap-y-1.5 text-sm">
          {order.map((d) => {
            const h = settings.hours[d];
            return (
              <div key={d} className="contents">
                <dt className="capitalize text-muted">{WEEKDAYS_ES[d]}</dt>
                <dd className="tabular">{h ? `${formatTimeEs(h.open)} – ${formatTimeEs(h.close)}` : "Cerrado"}</dd>
              </div>
            );
          })}
        </dl>
        {settings.address && (
          <p className="mt-6 text-sm text-ink-2">
            {settings.address}
            {settings.mapsUrl && (
              <>
                {" · "}
                <a href={settings.mapsUrl} target="_blank" rel="noreferrer" className="text-cobalt hover:underline">
                  Cómo llegar
                </a>
              </>
            )}
          </p>
        )}
      </section>

      <section className="h-[640px] max-h-[86dvh] animate-[rise_900ms_var(--ease-out-expo)_150ms_both]">{chat}</section>

      <footer className="flex items-center gap-2 text-sm text-muted lg:col-span-2">
        <LogoMark className="size-5" />
        <span>
          Reservas con{" "}
          <Link href="/" className="font-medium text-ink-2 hover:text-ink">
            Velora
          </Link>
        </span>
      </footer>
    </div>
  );
}
