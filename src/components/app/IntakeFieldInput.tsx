"use client";

import type { IntakeField } from "@/lib/domain/types";

/** One question as the customer sees it (also used for the live preview). */
export function IntakeFieldInput({
  field: f,
  value,
  onChange,
  disabled,
}: {
  field: IntakeField;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
  disabled?: boolean;
}) {
  const id = `intake-${f.id}`;
  if (f.type === "checkbox") {
    return (
      <label htmlFor={id} className="flex items-start gap-3 rounded-2xl border border-line px-4 py-3 text-[15px]">
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="mt-0.5 size-4 accent-cobalt" />
        <span>
          {f.label}
          {f.required && <span className="text-rose"> *</span>}
        </span>
      </label>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="label">
        {f.label}
        {f.required && <span className="text-rose"> *</span>}
      </label>
      {f.type === "textarea" ? (
        <textarea id={id} rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field" maxLength={1000} />
      ) : f.type === "select" ? (
        <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field">
          <option value="">Elige una opción</option>
          {(f.options ?? []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field" maxLength={300} />
      )}
    </div>
  );
}
