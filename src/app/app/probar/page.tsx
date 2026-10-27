import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { getSettings, listServices } from "@/lib/data/store";
import { chatSuggestions } from "@/lib/suggestions";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { ChatWidget } from "@/components/chat/ChatWidget";

const HELP = {
  id: "probar",
  steps: [
    { title: "Escribe como un cliente", body: "Pide una cita, pregunta precios u horarios, o pide hablar con una persona." },
    { title: "Es tu agenda real", body: "Las citas que agendes aquí aparecen en tu Agenda (puedes cancelarlas después)." },
    { title: "Mira la conversación", body: "Cada prueba queda en Conversaciones, igual que la de un cliente." },
    { title: "Empieza de nuevo", body: "“Nueva conversación” borra el chat para probar otro caso." },
  ],
};

export default function TryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Try />
    </Suspense>
  );
}

async function Try() {
  const session = await requireSession();
  const [settings, services] = await Promise.all([getSettings(), listServices()]);
  return (
    <>
      <PageHeader
        help={HELP}
        title={`Probar a ${settings.assistantName}`}
        description="Escríbele como lo haría un cliente. Así responde en tu página de reservas y en WhatsApp."
      />
      <div className="grid gap-8 px-5 py-6 lg:grid-cols-[minmax(0,640px)_1fr] lg:px-10">
        <div className="h-[min(720px,calc(100dvh-260px))] min-h-[480px] animate-[rise_800ms_var(--ease-out-expo)_both]">
          <ChatWidget
            businessId={session.businessId}
            greeting={settings.welcomeMessage}
            assistantName={settings.assistantName}
            bookedNote="¡Listo! Esta cita ya está en tu Agenda."
            suggestions={chatSuggestions(services)}
          />
        </div>
        <aside className="stagger hidden space-y-4 lg:block">
          {[
            ["💬", "Pruébala con frases reales", "“mañana en la tarde”, “el viernes a las 3”, “con Ana”, “cuánto vale”."],
            ["🔁", "Mueve o cancela", "Escribe “quiero cambiar mi cita” o “cancelar” después de agendar."],
            ["🙋", "Pide una persona", "“quiero hablar con alguien” la hace pasarle el chat a tu equipo."],
          ].map(([icon, title, body]) => (
            <div key={title} className="spotlight spotlight rounded-2xl border border-line bg-paper p-5">
              <span className="text-2xl" aria-hidden>
                {icon}
              </span>
              <p className="mt-2 font-medium">{title}</p>
              <p className="mt-1 text-sm text-ink-2">{body}</p>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
