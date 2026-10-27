"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { setPaymentAction } from "@/app/app/actions";
import { formatTimeEs } from "@/lib/domain/time";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/domain/types";

type Line = {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  price: number;
  amount: number | null;
  method: PaymentMethod | "wompi" | null;
  kind: "visit" | "deposit";
};

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function CashTable({ lines }: { lines: Line[] }) {
  if (!lines.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
        No hay citas atendidas este día. Cuando marques una como atendida en la agenda, aparecerá aquí.
      </div>
    );
  }
  return (
    <ul className="stagger divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-paper">
      {lines.map((l) => (
        <Row key={l.id} line={l} />
      ))}
    </ul>
  );
}

function Row({ line: l }: { line: Line }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(l.amount ?? l.price);
  const [method, setMethod] = useState<PaymentMethod>(l.method && l.method !== "wompi" ? l.method : "efectivo");
  const [pending, start] = useTransition();

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="tabular w-20 text-sm text-muted">{formatTimeEs(l.time)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{l.customer}</span>
          <span className="block truncate text-sm text-muted">
            {l.service}
            {l.staff && ` · ${l.staff}`}
          </span>
        </span>
        {l.amount !== null ? (
          <span className="text-right">
            <span className="tabular block font-semibold">{money(l.amount)}</span>
            <span className="text-xs text-muted">{l.method === "wompi" ? "Wompi" : l.method ? PAYMENT_LABEL[l.method] : ""}</span>
          </span>
        ) : (
          <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-medium text-amber-ink">Sin registrar</span>
        )}
        {l.kind === "visit" && (
          <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-full px-3 py-1 text-sm text-cobalt hover:bg-cobalt-soft">
            {l.amount === null ? "Registrar" : "Editar"}
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-3 flex animate-[rise_400ms_var(--ease-out-expo)_both] flex-wrap items-center gap-2 rounded-2xl bg-porcelain/60 p-3">
          <input aria-label="Valor" type="number" min={0} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="field h-9 w-36 py-0" />
          {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={method === m}
              onClick={() => setMethod(m)}
              className={clsx("rounded-full border px-3 py-1 text-sm", method === m ? "border-night bg-night text-white" : "border-line bg-paper")}
            >
              {PAYMENT_LABEL[m]}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => void (await setPaymentAction(l.id, { amount, method }), setEditing(false)))}
            className="btn-primary btn-sm ml-auto"
          >
            Guardar
          </button>
        </div>
      )}
    </li>
  );
}
