"use client";

import { useState } from "react";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the field stays selectable */
    }
  };
  return (
    <div className="mt-4 flex gap-2">
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="field min-w-0 font-mono text-[13px]" />
      <button type="button" onClick={copy} className="btn-primary btn-sm shrink-0" aria-live="polite">
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
