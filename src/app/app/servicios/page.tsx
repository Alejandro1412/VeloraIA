import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { getSettings, listServices } from "@/lib/data/store";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { ServicesEditor } from "@/components/app/ServicesEditor";

export default function ServicesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Services />
    </Suspense>
  );
}

async function Services() {
  await requireSession();
  const [services, settings] = await Promise.all([listServices(), getSettings()]);
  return (
    <>
      <PageHeader
        title="Servicios"
        description={`Lo que ${settings.assistantName} puede agendar, con su duración y precio. Las palabras clave le ayudan a entender cómo lo piden tus clientes.`}
      />
      <ServicesEditor services={services} />
    </>
  );
}
