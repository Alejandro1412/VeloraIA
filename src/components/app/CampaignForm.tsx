"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { sendCampaignAction } from "@/app/app/actions";

const PRESETS = [
  {
    name: "Te extrañamos",
    message: "¡Hola {nombre}! 👋 Hace un tiempo no te vemos en {negocio}. ¿Agendamos tu próxima cita de {servicio}? Elige tu horario aquí: {enlace}",
  },
  {
    name: "Control pendiente",
    message: "Hola {nombre}, ya es momento de tu control de {servicio} en {negocio} 🗓️ Reserva en 30 segundos: {enlace}",
  },
  {
    name: "Promoción del mes",
    message: "¡{nombre}, este mes tenemos una sorpresa para ti en {negocio}! 🎁 Agenda tu cita y pregúntanos por la promo: {enlace}",
  },
];

export function CampaignForm({
  months,
  serviceId,
  services,
  audience,
  live,
  business,
  link,
}: {
  months: number;
  serviceId: string;
  services: { id: string; name: string }[];
  audience: { name: string; phone: string; lastVisit: string; lastService: string }[];
  live: boolean;
  business: string;
  link: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(sendCampaignAction, null);
  const [name, setName] = useState(PRESETS[0].name);
  const [message, setMessage] = useState(PRESETS[0].message);
  const sample = audience[0];
  const preview = useMemo(
    () =>
      message
        .replaceAll("{nombre}", sample?.name.split(" ")[0] ?? "Ana")
        .replaceAll("{negocio}", business)
        .replaceAll("{enlace}", link)
        .replaceAll("{servicio}", (sample?.lastService ?? "tu servicio").toLowerCase()),
    [message, sample, business, link],
  );
  const setFilter = (k: string, v: string) => {
    const p = new URLSearchParams({ meses: String(months), servicio: serviceId, [k]: v });
    router.replace(`/app/campanas?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_1fr]">
      <form action={action} className="space-y-6">
        {/* step 1 */}
        <section className="spotlight rounded-2xl border border-line bg-paper p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-cobalt">
            <span className="grid size-6 place-items-center rounded-full bg-cobalt text-xs text-white">1</span> ¿A quién le escribimos?
          </p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Meses sin venir">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={months === m}
                onClick={() => setFilter("meses", String(m))}
                className={clsx(
                  "rounded-full border px-4 py-2 text-sm transition-all duration-300",
                  months === m ? "border-night bg-night text-white" : "border-line hover:-translate-y-0.5 hover:border-ink-2",
                )}
              >
                Sin venir hace {m}+ meses
              </button>
            ))}
          </div>
          <label htmlFor="cmp-service" className="label mt-4">
            Último servicio (opcional)
          </label>
          <select id="cmp-service" value={serviceId} onChange={(e) => setFilter("servicio", e.target.value)} className="field">
            <option value="">Cualquiera</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input type="hidden" name="months" value={months} />
          <input type="hidden" name="serviceId" value={serviceId} />
        </section>

        {/* step 2 */}
        <section className="spotlight rounded-2xl border border-line bg-paper p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-cobalt">
            <span className="grid size-6 place-items-center rounded-full bg-cobalt text-xs text-white">2</span> El mensaje
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => (setName(p.name), setMessage(p.message))}
                className={clsx("rounded-full border px-3 py-1.5 text-sm transition-colors", name === p.name ? "border-cobalt text-cobalt" : "border-line text-ink-2 hover:border-ink-2")}
              >
                {p.name}
              </button>
            ))}
          </div>
          <label htmlFor="cmp-name" className="label mt-4">
            Nombre de la campaña
          </label>
          <input id="cmp-name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="field" />
          <label htmlFor="cmp-msg" className="label mt-4">
            Mensaje
          </label>
          <textarea id="cmp-msg" name="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={900} className="field" />
          <p className="mt-1 text-xs text-muted">
            Palabras mágicas: <code>{"{nombre}"}</code> <code>{"{servicio}"}</code> <code>{"{negocio}"}</code> <code>{"{enlace}"}</code>
          </p>
        </section>

        {/* step 3 */}
        <section className="spotlight rounded-2xl border border-line bg-paper p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-cobalt">
            <span className="grid size-6 place-items-center rounded-full bg-cobalt text-xs text-white">3</span> Enviar
          </p>
          <p className="mt-3 text-sm text-ink-2">
            {live
              ? `Se enviará por tu WhatsApp a ${audience.length} ${audience.length === 1 ? "cliente" : "clientes"}.`
              : `Tu WhatsApp aún no está conectado: prepararemos ${audience.length} mensajes para que los envíes con un toque desde tu celular.`}
          </p>
          <button type="submit" disabled={pending || audience.length === 0} className="btn-primary mt-4 w-full">
            {pending ? "Preparando…" : live ? `Enviar a ${audience.length} clientes` : `Preparar ${audience.length} mensajes`}
          </button>
          {state?.error && (
            <p role="alert" className="mt-3 text-sm text-rose">
              {state.error}
            </p>
          )}
        </section>
      </form>

      <div className="space-y-6">
        {/* phone preview */}
        <div className="mx-auto w-full max-w-sm rounded-[36px] border border-line bg-paper p-3 shadow-[0_40px_90px_-50px_rgba(14,27,61,.55)]">
          <div className="rounded-[28px] bg-[#e7ddd3] p-4 dark:bg-[#0b141a]">
            <p className="text-center text-xs text-black/50 dark:text-white/50">Vista previa</p>
            <motion.div
              key={preview}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-3 rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[14px] leading-snug whitespace-pre-line text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]"
            >
              {preview}
            </motion.div>
          </div>
        </div>

        <section aria-labelledby="aud-title" className="rounded-2xl border border-line bg-paper">
          <h2 id="aud-title" className="flex items-center justify-between border-b border-line-soft px-5 py-3 font-medium">
            Clientes en esta campaña
            <span className="tabular rounded-full bg-cobalt-soft px-2.5 py-0.5 text-sm text-cobalt">{audience.length}</span>
          </h2>
          {audience.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Nadie cumple el filtro. ¡Buena señal! Prueba con menos meses.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line-soft overflow-y-auto">
              {audience.slice(0, 60).map((a) => (
                <li key={a.phone} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="truncate">{a.name}</span>
                  <span className="shrink-0 text-muted">
                    {a.lastService} · {new Date(`${a.lastVisit}T12:00:00Z`).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AnimatePresence>
        {state?.ok && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-mint/40 bg-mint-soft p-5 xl:col-span-2"
            role="status"
          >
            <p className="font-medium text-mint-ink">{state.message}</p>
            {"manual" in state && state.manual && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {state.manual.map((m) => (
                  <li key={m.url}>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-2.5 text-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="shrink-0 font-medium text-mint-ink">Enviar →</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
