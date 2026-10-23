import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/" aria-label="Volver al inicio">
        <Logo />
      </Link>
      <h1 className="mt-12 font-display text-4xl font-semibold tracking-tight">Política de tratamiento de datos</h1>
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-ink-2">
        <p>
          Velora es un servicio de IONEX. Tratamos los datos personales de los clientes de nuestros comercios aliados
          (nombre, número de teléfono e historial de citas) únicamente para agendar, confirmar, reprogramar y recordar
          citas, de acuerdo con la Ley 1581 de 2012 y el Decreto 1377 de 2013.
        </p>
        <p>
          El responsable del tratamiento es el comercio con el que el usuario agenda. IONEX actúa como encargado del
          tratamiento y no vende ni comparte los datos con terceros distintos a los proveedores tecnológicos necesarios
          para operar el servicio (mensajería, infraestructura en la nube y modelos de lenguaje).
        </p>
        <p>
          Puedes conocer, actualizar, rectificar o pedir la eliminación de tus datos escribiendo al comercio donde
          agendaste o al correo de contacto de IONEX.
        </p>
      </div>
    </main>
  );
}
