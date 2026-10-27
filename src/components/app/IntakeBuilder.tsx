"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, Reorder } from "motion/react";
import { clsx } from "clsx";
import type { IntakeField } from "@/lib/domain/types";
import { saveIntakeFieldsAction } from "@/app/app/actions";
import { IntakeFieldInput } from "./IntakeFieldInput";

const TYPES: [IntakeField["type"], string][] = [
  ["text", "Respuesta corta"],
  ["textarea", "Respuesta larga"],
  ["select", "Opciones"],
  ["checkbox", "Casilla (sí / acepto)"],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30) || "pregunta";

export function IntakeBuilder({ initial, template, vertical, demo }: { initial: IntakeField[]; template: IntakeField[]; vertical: string; demo: boolean }) {
  const [fields, setFields] = useState<IntakeField[]>(initial);
  const [preview, setPreview] = useState<Record<string, string | boolean>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<IntakeField>) => setFields((list) => list.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const add = () => {
    const base = `pregunta_${fields.length + 1}`;
    setFields((l) => [...l, { id: l.some((f) => f.id === base) ? `${base}_${Date.now() % 1000}` : base, label: "Nueva pregunta", type: "text" }]);
  };
  const save = () =>
    start(async () => {
      // Stable ids derived from the label for new questions.
      const seen = new Set<string>();
      const clean = fields.map((f) => {
        let id = f.id.startsWith("pregunta_") ? slug(f.label) : f.id;
        while (seen.has(id)) id = `${id}_2`;
        seen.add(id);
        return { ...f, id, options: f.type === "select" ? (f.options ?? []).filter(Boolean) : undefined };
      });
      const r = await saveIntakeFieldsAction(clean);
      setMsg(r?.error ? { ok: false, text: r.error } : { ok: true, text: "¡Guardado! Tus clientes ya lo ven en el enlace de su cita." });
      if (!r?.error) setFields(clean);
    });

  return (
    <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
      <div>
        {fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
            <p className="font-medium">Aún no tienes preguntas</p>
            <p className="mt-1 text-sm text-muted">Empieza con la plantilla para {vertical.toLowerCase()} o crea las tuyas.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setFields(template)} className="btn-primary btn-sm">
                Usar plantilla ({template.length} preguntas)
              </button>
              <button type="button" onClick={add} className="btn-ghost btn-sm">
                Empezar en blanco
              </button>
            </div>
          </div>
        ) : (
          <Reorder.Group axis="y" values={fields} onReorder={setFields} className="space-y-3">
            <AnimatePresence initial={false}>
              {fields.map((f, i) => (
                <Reorder.Item key={f.id} value={f} className="spotlight rounded-2xl border border-line bg-paper p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <div className="flex items-start gap-3">
                    <span className="mt-2.5 cursor-grab text-muted active:cursor-grabbing" data-tip="Arrastra para ordenar" aria-hidden>
                      ⋮⋮
                    </span>
                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_180px]">
                      <input aria-label="Pregunta" value={f.label} onChange={(e) => update(i, { label: e.target.value })} className="field" />
                      <select aria-label="Tipo" value={f.type} onChange={(e) => update(i, { type: e.target.value as IntakeField["type"] })} className="field">
                        {TYPES.map(([t, l]) => (
                          <option key={t} value={t}>
                            {l}
                          </option>
                        ))}
                      </select>
                      {f.type === "select" && (
                        <input
                          aria-label="Opciones"
                          value={(f.options ?? []).join(", ")}
                          onChange={(e) => update(i, { options: e.target.value.split(",").map((o) => o.trim()) })}
                          placeholder="Opciones separadas por comas: Sí, No, No sé"
                          className="field sm:col-span-2"
                        />
                      )}
                      <label className="flex items-center gap-2 text-sm text-ink-2">
                        <input type="checkbox" checked={!!f.required} onChange={(e) => update(i, { required: e.target.checked })} className="accent-cobalt" />
                        Obligatoria
                      </label>
                    </div>
                    <button type="button" onClick={() => setFields((l) => l.filter((_, j) => j !== i))} aria-label={`Quitar ${f.label}`} className="rounded-full px-2 py-1 text-muted hover:bg-rose-soft hover:text-rose">
                      ✕
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {fields.length > 0 && (
            <button type="button" onClick={add} className="btn-ghost btn-sm">
              + Agregar pregunta
            </button>
          )}
          <button type="button" onClick={save} disabled={pending || demo} className="btn-primary btn-sm">
            {pending ? "Guardando…" : "Guardar formulario"}
          </button>
          {msg && <p className={clsx("text-sm", msg.ok ? "text-mint-ink" : "text-rose")}>{msg.text}</p>}
        </div>
      </div>

      <aside>
        <p className="mb-3 text-sm font-medium text-ink-2">Así lo ve tu cliente</p>
        <div className="mx-auto max-w-sm rounded-[32px] border border-line bg-porcelain p-3 shadow-[0_40px_90px_-50px_rgba(14,27,61,.55)]">
          <div className="space-y-4 rounded-[24px] bg-paper p-5">
            <p className="font-display text-lg font-semibold">Antes de tu cita</p>
            {fields.length === 0 && <p className="text-sm text-muted">Las preguntas aparecerán aquí.</p>}
            {fields.map((f) => (
              <IntakeFieldInput key={f.id} field={f} value={preview[f.id]} onChange={(v) => setPreview((p) => ({ ...p, [f.id]: v }))} />
            ))}
            {fields.length > 0 && <div className="btn-primary pointer-events-none w-full opacity-90">Enviar respuestas</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}
