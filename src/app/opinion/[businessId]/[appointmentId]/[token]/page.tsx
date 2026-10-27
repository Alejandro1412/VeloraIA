import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBusiness } from "@/lib/accounts";
import { getAppointment, getService, getSettings } from "@/lib/data/store";
import { verifyLink } from "@/lib/links";
import { DEMO_BUSINESS_ID, isValidBusinessId, withBusiness } from "@/lib/tenant";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { LogoMark } from "@/components/brand/Logo";
import { RateVisit } from "./RateVisit";

export const metadata: Metadata = { title: "¿Cómo te fue?", robots: { index: false } };

type Params = PageProps<"/opinion/[businessId]/[appointmentId]/[token]">["params"];

export default function SurveyPage({ params }: { params: Params }) {
  return (
    <main className="min-h-dvh px-5 py-8">
      <Suspense fallback={<div className="shimmer mx-auto h-96 max-w-lg rounded-[28px]" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: Params }) {
  const { businessId, appointmentId, token } = await params;
  if (!isValidBusinessId(businessId) || !verifyLink("opinion", businessId, appointmentId, token)) notFound();
  if (businessId !== DEMO_BUSINESS_ID && !(await getBusiness(businessId))) notFound();
  const data = await withBusiness(businessId, async () => {
    const apt = await getAppointment(appointmentId);
    if (!apt) return null;
    const [settings, service] = await Promise.all([getSettings(), getService(apt.serviceId)]);
    return { apt, settings, service };
  });
  if (!data) notFound();
  const { apt, settings, service } = data;

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-muted">
          <LogoMark className="size-5" /> {settings.name}
        </p>
        <ThemeToggle />
      </div>
      <section className="mt-6 animate-[rise_800ms_var(--ease-out-expo)_both] rounded-[28px] border border-line bg-paper p-7 text-center shadow-[0_40px_90px_-50px_rgba(14,27,61,.55)]">
        <span aria-hidden className="mx-auto grid size-16 animate-[float_4s_ease-in-out_infinite] place-items-center rounded-2xl bg-gradient-to-br from-amber-soft to-cobalt-soft text-3xl">
          💬
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">¿Cómo te fue?</h1>
        <p className="mt-2 text-ink-2">
          Cuéntanos de tu visita{service ? ` para ${service.name.toLowerCase()}` : ""} en {settings.name}. Toma 10 segundos.
        </p>
        <RateVisit refs={{ businessId, appointmentId, token }} initial={apt.rating ?? 0} businessName={settings.name} />
      </section>
    </div>
  );
}
