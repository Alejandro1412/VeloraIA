import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/data/store";
import { intakeTemplateFor } from "@/lib/intake";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { IntakeBuilder } from "@/components/app/IntakeBuilder";

const HELP = {
  id: "formulario",
  steps: [
    { title: "Preguntas antes de la cita", body: "Alergias, motivo, datos de la mascota o del vehículo, consentimiento…" },
    { title: "El cliente lo llena solo", body: "Desde el enlace de su cita, que va en la confirmación y en el recordatorio." },
    { title: "Lo ves en la agenda", body: "Las respuestas aparecen al abrir la cita y en la ficha del cliente." },
    { title: "Empieza con una plantilla", body: "Ya hay una lista para tu tipo de negocio; edítala como quieras." },
  ],
};

export default function IntakePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Intake />
    </Suspense>
  );
}

async function Intake() {
  const session = await requireOwner();
  const settings = await getSettings();
  return (
    <>
      <PageHeader help={HELP} title="Formulario previo" description="Lo que tus clientes te cuentan antes de llegar." />
      <div className="px-5 py-6 lg:px-10">
        <IntakeBuilder initial={settings.intakeFields ?? []} template={intakeTemplateFor(settings.vertical)} vertical={settings.vertical} demo={session.demo} />
      </div>
    </>
  );
}
