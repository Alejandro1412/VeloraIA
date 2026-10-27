"use client";

import { useActionState, useState } from "react";
import { saveSettingsAction } from "@/app/app/actions";
import type { BusinessSettings } from "@/lib/domain/types";
import { WEEKDAYS_ES } from "@/lib/domain/time";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function SettingsForm({ settings: s, demo = false }: { settings: BusinessSettings; demo?: boolean }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  const [openDays, setOpenDays] = useState(() => s.hours.map(Boolean));

  return (
    <form action={action} className="space-y-12">
      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-semibold tracking-tight">Tu negocio</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Nombre del negocio" defaultValue={s.name} required />
          <Field id="vertical" label="Tipo de negocio" defaultValue={s.vertical} placeholder="Odontología, estética, veterinaria…" />
          <Field id="phone" label="Teléfono" defaultValue={s.phone} />
          <Field id="address" label="Dirección" defaultValue={s.address} />
          <div className="sm:col-span-2">
            <Field id="mapsUrl" label="Enlace de Google Maps" defaultValue={s.mapsUrl} type="url" />
          </div>
          <div className="sm:col-span-2">
            <Field
              id="whatsappPhoneNumberId"
              label="ID del número de WhatsApp Business (lo entrega IONEX)"
              defaultValue={s.whatsappPhoneNumberId ?? ""}
              inputMode="numeric"
              placeholder="Ej.: 109876543210987"
              disabled={demo}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-semibold tracking-tight">Tu recepcionista</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="assistantName" label="Nombre" defaultValue={s.assistantName} />
          <Field id="reminderHoursBefore" label="Recordatorio (horas antes)" type="number" defaultValue={String(s.reminderHoursBefore)} min={1} max={72} />
          <div className="sm:col-span-2">
            <label htmlFor="welcomeMessage" className="label">
              Mensaje de bienvenida
            </label>
            <textarea id="welcomeMessage" name="welcomeMessage" rows={3} defaultValue={s.welcomeMessage} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="extraInstructions" className="label">
              Instrucciones especiales
            </label>
            <textarea
              id="extraInstructions"
              name="extraInstructions"
              rows={3}
              defaultValue={s.extraInstructions}
              placeholder="Ej.: los menores de edad deben venir con un acudiente."
              className="field"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-semibold tracking-tight">Avisos para ti</legend>
        <p className="text-sm text-ink-2">Te avisamos de citas nuevas, cancelaciones y clientes que piden hablar con tu equipo.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="notifyEmail" label="Correo para avisos" type="email" defaultValue={s.notifyEmail ?? ""} placeholder="tu@negocio.com" />
          <Field id="notifyWhatsapp" label="WhatsApp para avisos" type="tel" defaultValue={s.notifyWhatsapp ?? ""} placeholder="+57 300 123 4567" />
          <div className="sm:col-span-2">
            <Field
              id="googleReviewUrl"
              label="Enlace para dejar reseña en Google (se envía después de cada cita atendida)"
              type="url"
              defaultValue={s.googleReviewUrl ?? ""}
              placeholder="https://g.page/r/…/review"
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-display text-xl font-semibold tracking-tight">Horario de atención</legend>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-normal">Día</th>
                <th className="px-2 py-3 font-normal">Abre</th>
                <th className="px-2 py-3 font-normal">Cierra</th>
                <th className="px-2 py-3 font-normal">Pausa desde</th>
                <th className="px-2 py-3 font-normal">Pausa hasta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {ORDER.map((d) => {
                const h = s.hours[d];
                const on = openDays[d];
                return (
                  <tr key={d}>
                    <td className="px-4 py-2.5">
                      <label className="flex items-center gap-2 capitalize">
                        <input
                          type="checkbox"
                          name={`day${d}_open`}
                          checked={on}
                          onChange={(e) => setOpenDays((v) => v.map((x, i) => (i === d ? e.target.checked : x)))}
                          className="accent-cobalt"
                        />
                        {WEEKDAYS_ES[d]}
                      </label>
                    </td>
                    {(["from", "to", "break_from", "break_to"] as const).map((k) => (
                      <td key={k} className="px-2 py-2.5">
                        <input
                          type="time"
                          name={`day${d}_${k}`}
                          aria-label={`${WEEKDAYS_ES[d]}: ${{ from: "abre", to: "cierra", break_from: "pausa desde", break_to: "pausa hasta" }[k]}`}
                          disabled={!on}
                          defaultValue={
                            k === "from" ? (h?.open ?? "08:00") : k === "to" ? (h?.close ?? "17:00") : k === "break_from" ? (h?.breaks[0]?.start ?? "") : (h?.breaks[0]?.end ?? "")
                          }
                          className="field px-2 py-1.5 disabled:opacity-40"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-semibold tracking-tight">Reglas de agenda</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="capacity" label="Citas al mismo tiempo" type="number" min={1} max={50} defaultValue={String(s.capacity)} />
          <div>
            <label htmlFor="slotStepMinutes" className="label">
              Intervalo entre horarios
            </label>
            <select id="slotStepMinutes" name="slotStepMinutes" defaultValue={String(s.slotStepMinutes)} className="field">
              {[10, 15, 20, 30, 60].map((m) => (
                <option key={m} value={m}>
                  Cada {m} min
                </option>
              ))}
            </select>
          </div>
          <Field id="minNoticeMinutes" label="Anticipación mínima (min)" type="number" min={0} defaultValue={String(s.minNoticeMinutes)} />
          <Field id="maxDaysAhead" label="Agenda abierta (días)" type="number" min={1} max={180} defaultValue={String(s.maxDaysAhead)} />
        </div>
      </fieldset>

      <div className="sticky bottom-20 flex items-center gap-4 rounded-2xl border border-line bg-paper/95 px-5 py-3 backdrop-blur lg:bottom-4">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <p role="status" className={state?.error ? "text-sm text-rose" : "text-sm text-mint"}>
          {state?.error ?? (state?.ok ? state.message : "")}
        </p>
      </div>
    </form>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} name={id} className="field" {...rest} />
    </div>
  );
}
