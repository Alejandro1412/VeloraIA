import Link from "next/link";
import { ChatWidget } from "../chat/ChatWidget";
import { DEFAULT_SETTINGS } from "@/lib/data/seed";
import { demoAction } from "@/app/login/actions";

export function DemoSection() {
  return (
    <section id="demo" aria-labelledby="demo-title" className="bg-porcelain py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="demo-title" className="font-display text-[clamp(2.3rem,4.4vw,3.8rem)] leading-[1] font-semibold tracking-[-0.03em]">
            Pídele una cita a Sofía. Es la de verdad.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
            Esta es la recepcionista de una clínica dental de prueba en Cali. Revisa la agenda real, te ofrece horarios
            libres y agenda. Pruébala como lo haría un paciente:
          </p>
          <ul className="mt-6 space-y-3 text-[16px] text-ink-2">
            <li className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cobalt" />
              Pide una cita con día y hora, o solo con el servicio.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cobalt" />
              Escribe “quiero cambiar mi cita” o “cancelar mi cita” después.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cobalt" />
              Pregunta precios, horarios o la dirección.
            </li>
          </ul>
          <form action={demoAction} className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button type="submit" className="btn-ghost btn-sm">
              Ver la agenda de la clínica
            </button>
            <Link href="/registro" className="text-[15px] font-medium text-cobalt underline-offset-4 hover:underline">
              Crear la de mi negocio
            </Link>
          </form>
        </div>
        <div className="h-[620px] max-h-[82dvh]">
          <ChatWidget greeting={DEFAULT_SETTINGS.welcomeMessage} assistantName={DEFAULT_SETTINGS.assistantName} />
        </div>
      </div>
    </section>
  );
}
