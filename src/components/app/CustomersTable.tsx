"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { saveCustomerNotesAction } from "@/app/app/actions";
import { formatDateEs, formatMoney, formatTimeEs } from "@/lib/domain/time";
import type { AppointmentStatus } from "@/lib/domain/types";
import { Empty, StatusBadge } from "./ui";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  notes: string;
  intake: { label: string; value: string }[];
  visits: number;
  noShows: number;
  cancellations: number;
  spent: number;
  lastVisit: string | null;
  nextVisit: string | null;
  history: {
    id: string;
    date: string;
    time: string;
    service: string;
    staff: string;
    status: AppointmentStatus;
    rating?: number;
    feedback?: string;
    session?: string;
  }[];
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function CustomersTable({ rows, currency, openId }: { rows: CustomerRow[]; currency: string; openId?: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "risk" | "upcoming">("all");
  const [open, setOpen] = useState<CustomerRow | null>(() => rows.find((r) => r.id === openId) ?? null);

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return rows.filter((r) => {
      if (filter === "risk" && r.noShows === 0) return false;
      if (filter === "upcoming" && !r.nextVisit) return false;
      return !q || norm(r.name).includes(q) || r.phone.includes(q.replace(/\s/g, ""));
    });
  }, [rows, query, filter]);

  return (
    <div className="px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="customer-search" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="customer-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o celular"
          className="field max-w-xs"
        />
        <div className="flex gap-1 rounded-full border border-line bg-paper p-1 text-sm" role="group" aria-label="Filtrar clientes">
          {(
            [
              ["all", "Todos"],
              ["upcoming", "Con cita próxima"],
              ["risk", "Han faltado"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={clsx("rounded-full px-3 py-1.5", filter === k ? "bg-night text-white" : "text-ink-2 hover:bg-porcelain")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-paper">
        {visible.length === 0 ? (
          <div className="p-5">
            <Empty title={rows.length ? "Ningún cliente coincide" : "Aún no tienes clientes"}>
              {rows.length ? "Prueba con otro nombre o quita el filtro." : "Aparecerán aquí cuando agenden su primera cita."}
            </Empty>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-normal">Cliente</th>
                <th className="px-3 py-3 font-normal">Visitas</th>
                <th className="px-3 py-3 font-normal">Faltas</th>
                <th className="px-3 py-3 font-normal">Última visita</th>
                <th className="px-3 py-3 font-normal">Próxima cita</th>
                <th className="px-5 py-3 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {visible.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-porcelain/60" onClick={() => setOpen(r)}>
                  <td className="px-5 py-3">
                    <button type="button" className="text-left font-medium hover:text-cobalt" onClick={() => setOpen(r)}>
                      {r.name}
                    </button>
                    <span className="block text-xs text-muted">{r.phone || "Chat web"}</span>
                  </td>
                  <td className="tabular px-3 py-3">{r.visits}</td>
                  <td className="tabular px-3 py-3">
                    {r.noShows > 0 ? <span className="rounded-full bg-amber-soft px-2 py-0.5 text-amber-ink">{r.noShows}</span> : "0"}
                  </td>
                  <td className="px-3 py-3 text-ink-2">{r.lastVisit ? formatDateEs(r.lastVisit) : "—"}</td>
                  <td className="px-3 py-3 text-ink-2">{r.nextVisit ? formatDateEs(r.nextVisit) : "—"}</td>
                  <td className="tabular px-5 py-3 text-right">{formatMoney(r.spent, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>{open && <CustomerDrawer key={open.id} row={open} currency={currency} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  );
}

function CustomerDrawer({ row, currency, onClose }: { row: CustomerRow; currency: string; onClose: () => void }) {
  const [notes, setNotes] = useState(row.notes);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const digits = row.phone.replace(/\D/g, "");

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-night/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 id="customer-title" className="font-display text-2xl font-semibold tracking-tight">
              {row.name}
            </h2>
            {digits ? (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="text-sm text-cobalt hover:underline">
                {row.phone} · Escribir por WhatsApp
              </a>
            ) : (
              <p className="text-sm text-muted">Llegó por el chat web</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-porcelain hover:text-ink" aria-label="Cerrar">
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Visitas", String(row.visits)],
              ["Faltas", String(row.noShows)],
              ["Total", formatMoney(row.spent, currency)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-porcelain px-2 py-3">
                <dd className="tabular font-display text-lg font-semibold">{v}</dd>
                <dt className="text-xs text-muted">{k}</dt>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <label htmlFor="customer-notes" className="label">
              Notas internas
            </label>
            <textarea
              id="customer-notes"
              rows={4}
              value={notes}
              onChange={(e) => (setNotes(e.target.value), setSaved(false))}
              placeholder="Alergias, preferencias, cómo prefiere que le escriban…"
              className="field"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={pending || notes === row.notes}
                onClick={() =>
                  start(async () => {
                    await saveCustomerNotesAction(row.id, notes);
                    setSaved(true);
                  })
                }
                className="btn-primary btn-sm"
              >
                {pending ? "Guardando…" : "Guardar notas"}
              </button>
              {saved && <span className="text-sm text-mint">Notas guardadas</span>}
            </div>
          </div>

          {row.intake.length > 0 && (
            <>
              <h3 className="mt-8 text-sm font-medium text-ink-2">Formulario previo (última respuesta)</h3>
              <dl className="mt-2 space-y-2 rounded-2xl border border-line bg-porcelain/50 p-4 text-sm">
                {row.intake.map((q) => (
                  <div key={q.label}>
                    <dt className="text-muted">{q.label}</dt>
                    <dd className="font-medium whitespace-pre-line">{q.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <h3 className="mt-8 text-sm font-medium text-ink-2">Historial</h3>
          <ul className="mt-2 divide-y divide-line-soft rounded-2xl border border-line">
            {row.history.length === 0 && <li className="px-4 py-3 text-sm text-muted">Sin citas todavía.</li>}
            {row.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="block font-medium first-letter:uppercase">
                    {formatDateEs(h.date)} · {formatTimeEs(h.time)}
                  </span>
                  <span className="text-muted">
                    {h.service}
                    {h.session && ` · sesión ${h.session}`}
                    {h.staff && ` con ${h.staff}`}
                  </span>
                  {h.rating && (
                    <span className="mt-1 block text-amber" aria-label={`${h.rating} de 5 estrellas`}>
                      {"★".repeat(h.rating)}
                      <span className="text-line">{"★".repeat(5 - h.rating)}</span>
                      {h.feedback && <span className="ml-2 text-ink-2 italic">“{h.feedback}”</span>}
                    </span>
                  )}
                </span>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        </div>
      </motion.aside>
    </>
  );
}
