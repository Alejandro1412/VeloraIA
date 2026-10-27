"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-ghost btn-sm print:hidden">
      Descargar PDF
    </button>
  );
}
