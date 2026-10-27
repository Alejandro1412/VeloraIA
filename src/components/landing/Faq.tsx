const faqs = [
  {
    q: "¿Mis clientes tienen que descargar algo?",
    a: "No. Escriben al mismo número de WhatsApp de siempre o llaman a tu línea. Velora responde desde ahí.",
  },
  {
    q: "¿Qué pasa si la IA no sabe qué responder?",
    a: "Le pasa la conversación a tu equipo con todo el contexto y deja de responder en ese chat hasta que tú lo indiques desde el panel.",
  },
  {
    q: "¿Puede dar diagnósticos o consejos médicos?",
    a: "No. Está configurada para no hacerlo. Si alguien describe un síntoma, ofrece una valoración o una cita de urgencia y avisa a tu equipo.",
  },
  {
    q: "¿Es la API oficial de WhatsApp?",
    a: "Sí. Usamos WhatsApp Business Cloud API de Meta, que es el canal oficial y evita bloqueos del número. Los costos de mensajería de Meta van incluidos en los límites de cada plan.",
  },
  {
    q: "¿Cómo se manejan los datos de mis pacientes?",
    a: "Los datos son tuyos. Se guardan cifrados en tránsito, solo se usan para gestionar tus citas y firmamos contigo un acuerdo de tratamiento de datos conforme a la Ley 1581 de 2012.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. El servicio es mes a mes. Si cancelas, te entregamos la exportación de tu agenda y tus clientes.",
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="bg-porcelain py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 id="faq-title" className="font-display text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1] font-semibold tracking-[-0.03em]">
          Preguntas frecuentes
        </h2>
        <div className="border-t border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-lg font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="relative size-4 shrink-0" aria-hidden>
                  <span className="absolute top-1/2 left-0 h-0.5 w-4 -translate-y-1/2 bg-night" />
                  <span className="absolute top-1/2 left-0 h-0.5 w-4 -translate-y-1/2 rotate-90 bg-night transition-transform duration-300 group-open:rotate-0" />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 text-[16.5px] leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
