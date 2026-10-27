import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { getSettings, listServices } from "@/lib/data/store";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { ServicesEditor } from "@/components/app/ServicesEditor";

const HELP = {
  "id": "servicios",
  "steps": [
    {
      "title": "Lo que se puede agendar",
      "body": "Nombre, duración y precio de cada servicio."
    },
    {
      "title": "Palabras clave",
      "body": "Ayudan a entender cómo lo piden tus clientes: “sarro”, “corte”…"
    },
    {
      "title": "Reglas",
      "body": "Días en que se ofrece y descanso después de cada cita."
    },
    {
      "title": "Anticipo",
      "body": "Cobra una parte al agendar para reducir inasistencias."
    }
  ]
};

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
      <PageHeader help={HELP}
        title="Servicios"
        description={`Lo que ${settings.assistantName} puede agendar, con su duración y precio. Las palabras clave le ayudan a entender cómo lo piden tus clientes.`}
      />
      <ServicesEditor services={services} />
    </>
  );
}
