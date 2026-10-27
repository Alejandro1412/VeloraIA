"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import type { AdminRow } from "@/lib/admin";
import { activatePlanAction, extendTrialAction, pauseAction } from "./actions";

const STATUS: Record<AdminRow["status"], [string, string]> = {
  trial: ["Prueba", "bg-cobalt-soft text-cobalt"],
  active: ["Activo", "bg-mint-soft text-mint-ink"],
  grace: ["En gracia", "bg-amber-soft text-amber-ink"],
  paused: ["Pausado", "bg-rose-soft text-rose-ink"],
};

const FILTERS = [
  ["all", "Todos"],
  ["trial", "En prueba"],
  ["paying", "Pagando"],
  ["expiring", "Vencen pronto"],
  ["risk", "En riesgo"],
  ["paused", "Pausados"],
] as const;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export function AdminTable({ rows }: { rows: AdminRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<AdminRow | null>(null);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (t && !`${r.name} ${r.ownerEmail} ${r.ownerName} ${r.vertical}`.toLowerCase().includes(t)) return false;
      if (filter === "trial") return r.status === "trial";
      if (filter === "paying") return r.mrr > 0;
      if (filter === "expiring") return (r.status === "trial" || r.status === "active") && r.daysLeft <= 7;
      if (filter === "risk") return (r.inactiveDays ?? 99) >= 7 && r.status !== "paused";
      if (filter === "paused") return r.status === "paused";
      return true;
    });
  }, [rows, filter, q]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={clsx("rounded-full px-3.5 py-1.5 text-sm transition-colors", filter === k ? "bg-night text-white" : "text-ink-2 hover:bg-line-soft")}
            >
              {label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar negocio o correo…" aria-label="Buscar" className="field w-full max-w-xs rounded-full" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Vence</th>
              <th className="px-4 py-3 text-right font-medium">Citas 30d</th>
              <th className="px-4 py-3 text-right font-medium">Chats mes</th>
              <th className="px-4 py-3 font-medium">Último ingreso</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No hay negocios con ese filtro.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer transition-colors hover:bg-porcelain/60">
                <td className="px-4 py-3">
                  <span className="block font-medium">{r.name}</span>
                  <span className="text-xs text-muted">
                    {r.ownerEmail} · {r.vertical}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS[r.status][1])}>{STATUS[r.status][0]}</span>
                  <span className="ml-2 text-xs text-muted">{r.plan}</span>
                </td>
                <td className={clsx("px-4 py-3", r.daysLeft <= 7 && r.status !== "paused" && "font-medium text-amber-ink")}>
                  {r.daysLeft >= 0 ? `en ${r.daysLeft} d` : `hace ${-r.daysLeft} d`}
                </td>
                <td className="tabular px-4 py-3 text-right">{r.appointments30}</td>
                <td className="tabular px-4 py-3 text-right">{r.conversationsMonth}</td>
                <td className={clsx("px-4 py-3", (r.inactiveDays ?? 99) >= 7 && "text-rose-ink")}>
                  {r.inactiveDays === null ? "—" : r.inactiveDays === 0 ? "Hoy" : `Hace ${r.inactiveDays} d`}
                </td>
                <td className="px-4 py-3">{r.whatsapp ? "✓" : <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>{open && <Drawer key={open.id} row={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </section>
  );
}

function Drawer({ row: r, onClose }: { row: AdminRow; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.error ?? res.message ?? null);
    });
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-night/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={r.name}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-paper p-6 shadow-2xl"
      >
        <button type="button" onClick={onClose} className="self-end rounded-full px-3 py-1 text-sm text-muted hover:bg-porcelain">
          Cerrar
        </button>
        <span className={clsx("mt-2 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS[r.status][1])}>{STATUS[r.status][0]}</span>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{r.name}</h2>
        <p className="text-ink-2">
          {r.ownerName} · {r.ownerEmail}
        </p>
        <dl className="mt-6 grid grid-cols-[140px_1fr] gap-y-2 text-[15px]">
          <dt className="text-muted">Tipo</dt>
          <dd>{r.vertical}</dd>
          <dt className="text-muted">Registro</dt>
          <dd>{fmtDate(r.createdAt)}</dd>
          <dt className="text-muted">Plan</dt>
          <dd>{r.plan}</dd>
          <dt className="text-muted">{r.daysLeft >= 0 ? "Activo hasta" : "Venció"}</dt>
          <dd>{fmtDate(r.activeUntil)}</dd>
          <dt className="text-muted">Equipo</dt>
          <dd>{r.team} personas</dd>
          <dt className="text-muted">Citas (30 días)</dt>
          <dd>{r.appointments30}</dd>
          <dt className="text-muted">Chats este mes</dt>
          <dd>{r.conversationsMonth}</dd>
        </dl>

        <h3 className="mt-8 text-sm font-medium text-ink-2">Acciones</h3>
        <div className="mt-2 grid gap-2">
          <button type="button" disabled={pending} onClick={() => run(() => extendTrialAction(r.id, 7))} className="btn-ghost btn-sm justify-start">
            Extender prueba 7 días
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => extendTrialAction(r.id, 30))} className="btn-ghost btn-sm justify-start">
            Extender prueba 30 días
          </button>
          {(["esencial", "profesional", "sedes"] as const).map((p) => (
            <button
              key={p}
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm(`¿Registrar un pago manual del plan ${p} para ${r.name}? Suma un mes.`)) run(() => activatePlanAction(r.id, p));
              }}
              className="btn-ghost btn-sm justify-start"
            >
              Registrar pago manual · {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
          <a href={`mailto:${r.ownerEmail}?subject=${encodeURIComponent(`Tu cuenta de Velora · ${r.name}`)}`} className="btn-ghost btn-sm justify-start">
            Escribir al dueño
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`¿Pausar ${r.name}? Su recepcionista dejará de agendar.`)) run(() => pauseAction(r.id));
            }}
            className="btn btn-sm justify-start text-rose hover:bg-rose-soft"
          >
            Pausar negocio
          </button>
        </div>
        {msg && (
          <p role="status" className="mt-4 rounded-xl bg-mint-soft px-4 py-3 text-sm text-mint-ink">
            {msg} · se verá al recargar
          </p>
        )}
      </motion.aside>
    </>
  );
}
