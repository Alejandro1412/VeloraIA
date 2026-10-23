"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import {
  createAppointmentAction,
  rescheduleAction,
  setStatusAction,
  slotsAction,
} from "@/app/app/actions";
import { CHANNEL_LABEL, STATUS_LABEL, type AppointmentStatus, type Channel } from "@/lib/domain/types";
import { formatMoney, formatTimeEs, toMinutes } from "@/lib/domain/time";
import { StatusBadge } from "./ui";

export interface BoardAppointment {
  id: string;
  date: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  source: Channel;
  notes: string;
  serviceId: string;
  serviceName: string;
  price: number;
  customerName: string;
  customerPhone: string;
}

interface Props {
  days: { date: string; label: string; isToday: boolean }[];
  appointments: BoardAppointment[];
  startHour: number;
  endHour: number;
  services: { id: string; name: string; durationMinutes: number }[];
  today: string;
  openNew: boolean;
}

const tone: Record<AppointmentStatus, string> = {
  booked: "bg-cobalt text-white",
  confirmed: "bg-mint text-white",
  completed: "bg-line-soft text-ink-2",
  cancelled: "bg-rose-soft text-[#b4233a] line-through decoration-1",
  no_show: "bg-amber-soft text-[#8a5a12]",
};

/**
 * Calendar layout: overlapping appointments form a cluster and share its
 * width in lanes; appointments outside any overlap use the full column.
 */
function layout(items: BoardAppointment[]) {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
  const placed: { a: BoardAppointment; lane: number; lanes: number }[] = [];
  let cluster: { a: BoardAppointment; lane: number }[] = [];
  let lanesEnd: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, lanesEnd.length);
    cluster.forEach((c) => placed.push({ ...c, lanes }));
    cluster = [];
    lanesEnd = [];
  };
  for (const a of sorted) {
    const start = toMinutes(a.start);
    const end = toMinutes(a.end);
    if (start >= clusterEnd) flush();
    let lane = lanesEnd.findIndex((e) => e <= start);
    if (lane === -1) lane = lanesEnd.length;
    lanesEnd[lane] = end;
    cluster.push({ a, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return placed;
}

const HOUR_PX = 84;

const swatch: Record<AppointmentStatus, string> = {
  booked: "bg-cobalt",
  confirmed: "bg-mint",
  completed: "bg-line",
  cancelled: "bg-rose",
  no_show: "bg-amber",
};

export function AgendaBoard(props: Props) {
  const [selected, setSelected] = useState<BoardAppointment | null>(null);
  const [newOpen, setNewOpen] = useState(props.openNew);
  const [showCancelled, setShowCancelled] = useState(false);
  const hours = Array.from({ length: props.endHour - props.startHour }, (_, i) => props.startHour + i);
  const total = (props.endHour - props.startHour) * 60;
  const top = (t: string) => ((toMinutes(t) - props.startHour * 60) / total) * 100;

  const visible = props.appointments.filter((a) => showCancelled || a.status !== "cancelled");

  return (
    <div className="px-5 py-6 lg:px-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
          {(["booked", "confirmed", "completed", "no_show"] as AppointmentStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={clsx("size-2.5 rounded-sm", swatch[s])} />
              {STATUS_LABEL[s]}
            </span>
          ))}
          <label className="ml-2 flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-cobalt" />
            Mostrar canceladas
          </label>
        </div>
        <button type="button" onClick={() => setNewOpen(true)} className="btn-primary btn-sm">
          Nueva cita
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <div className="min-w-[760px]" style={{ display: "grid", gridTemplateColumns: `56px repeat(${props.days.length}, minmax(0,1fr))` }}>
          <div className="border-b border-line" />
          {props.days.map((d) => (
            <div key={d.date} className={clsx("border-b border-l border-line px-3 py-3", d.isToday && "bg-cobalt-soft/60")}>
              <p className={clsx("text-sm capitalize", d.isToday ? "font-semibold text-cobalt" : "text-ink-2")}>{d.label.split(" ")[0]}</p>
              <p className="tabular font-display text-2xl font-semibold tracking-tight">{d.date.slice(8)}</p>
            </div>
          ))}

          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-muted" style={{ top: `${(i / hours.length) * 100}%` }}>
                {i === 0 ? "" : `${h}:00`}
              </span>
            ))}
          </div>
          {props.days.map((d) => {
            const placed = layout(visible.filter((a) => a.date === d.date));
            return (
              <div key={d.date} className={clsx("relative border-l border-line", d.isToday && "bg-cobalt-soft/25")} style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h, i) => (
                  <span key={h} className="absolute inset-x-0 border-t border-line-soft" style={{ top: `${(i / hours.length) * 100}%` }} />
                ))}
                {placed.map(({ a, lane, lanes }) => {
                  const short = toMinutes(a.end) - toMinutes(a.start) < 45;
                  return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a)}
                    className={clsx(
                      "absolute overflow-hidden rounded-lg px-2 py-1 text-left text-[12px] leading-tight shadow-sm transition-[transform,box-shadow] duration-200 hover:z-10 hover:-translate-y-px hover:shadow-md",
                      tone[a.status],
                    )}
                    style={{
                      top: `calc(${top(a.start)}% + 1px)`,
                      height: `calc(${top(a.end) - top(a.start)}% - 3px)`,
                      left: `calc(${(lane / lanes) * 100}% + 3px)`,
                      width: `calc(${100 / lanes}% - 6px)`,
                    }}
                    aria-label={`${a.customerName}, ${a.serviceName}, ${formatTimeEs(a.start)}, ${STATUS_LABEL[a.status]}`}
                  >
                    {short ? (
                      <span className="block truncate">
                        <span className="tabular opacity-80">{a.start}</span> <span className="font-semibold">{a.customerName}</span>
                      </span>
                    ) : (
                      <>
                        <span className="tabular block opacity-80">{a.start}</span>
                        <span className="block truncate font-semibold">{a.customerName}</span>
                        <span className="block truncate opacity-80">{a.serviceName}</span>
                      </>
                    )}
                  </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && <AppointmentDrawer key={selected.id} appointment={selected} onClose={() => setSelected(null)} today={props.today} />}
      </AnimatePresence>
      <NewAppointmentDialog open={newOpen} onClose={() => setNewOpen(false)} services={props.services} today={props.today} />
    </div>
  );
}

/* ------------------------------- detail drawer ------------------------------ */

function AppointmentDrawer({ appointment: a, onClose, today }: { appointment: BoardAppointment; onClose: () => void; today: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(a.date >= today ? a.date : today);
  const [slots, setSlots] = useState<string[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!moving) return;
    let alive = true;
    slotsAction(a.serviceId, date).then((s) => alive && setSlots(s));
    return () => {
      alive = false;
    };
  }, [moving, date, a.serviceId]);

  const act = (status: AppointmentStatus) =>
    start(async () => {
      await setStatusAction(a.id, status);
      onClose();
    });

  const move = (time: string) =>
    start(async () => {
      const res = await rescheduleAction(a.id, date, time);
      if (res?.error) setError(res.error);
      else onClose();
    });

  const phoneDigits = a.customerPhone.startsWith("+") ? a.customerPhone.replace(/\D/g, "") : "";

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="apt-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <StatusBadge status={a.status} />
            <h2 id="apt-title" className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {a.customerName}
            </h2>
            <p className="text-ink-2">{a.serviceName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-porcelain hover:text-ink" aria-label="Cerrar">
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-[110px_1fr] gap-y-3 text-[15px]">
            <dt className="text-muted">Fecha</dt>
            <dd className="first-letter:uppercase">{new Date(`${a.date}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</dd>
            <dt className="text-muted">Hora</dt>
            <dd className="tabular">
              {formatTimeEs(a.start)} – {formatTimeEs(a.end)}
            </dd>
            <dt className="text-muted">Valor</dt>
            <dd>{formatMoney(a.price)}</dd>
            <dt className="text-muted">Canal</dt>
            <dd>{CHANNEL_LABEL[a.source]}</dd>
            <dt className="text-muted">Celular</dt>
            <dd>
              {phoneDigits ? (
                <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" className="text-cobalt hover:underline">
                  {a.customerPhone}
                </a>
              ) : (
                <span className="text-muted">Chat web</span>
              )}
            </dd>
            {a.notes && (
              <>
                <dt className="text-muted">Notas</dt>
                <dd>{a.notes}</dd>
              </>
            )}
          </dl>

          {moving && (
            <div className="mt-6 rounded-2xl bg-porcelain p-4">
              <label htmlFor="move-date" className="label">
                Nueva fecha
              </label>
              <input id="move-date" type="date" min={today} value={date} onChange={(e) => (setSlots(null), setDate(e.target.value))} className="field" />
              <p className="mt-4 mb-2 text-sm font-medium text-ink-2">Horarios libres</p>
              {slots === null ? (
                <p className="text-sm text-muted">Buscando horarios…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">No hay espacio ese día. Prueba otra fecha.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((t) => (
                    <button key={t} type="button" disabled={pending} onClick={() => move(t)} className="tabular rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-cobalt hover:text-cobalt">
                      {formatTimeEs(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-rose">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-line px-6 py-5">
          {(a.status === "booked" || a.status === "confirmed") && (
            <>
              {a.status === "booked" && (
                <button type="button" disabled={pending} onClick={() => act("confirmed")} className="btn-cobalt btn-sm">
                  Confirmar
                </button>
              )}
              <button type="button" disabled={pending} onClick={() => act("completed")} className="btn-primary btn-sm">
                Marcar atendida
              </button>
              <button type="button" disabled={pending} onClick={() => act("no_show")} className="btn-ghost btn-sm">
                No asistió
              </button>
              <button type="button" disabled={pending} onClick={() => setMoving((v) => !v)} className="btn-ghost btn-sm">
                {moving ? "Cerrar cambio" : "Mover cita"}
              </button>
              <button type="button" disabled={pending} onClick={() => act("cancelled")} className="btn btn-sm col-span-2 text-rose hover:bg-rose-soft">
                Cancelar cita
              </button>
            </>
          )}
          {(a.status === "completed" || a.status === "no_show" || a.status === "cancelled") && (
            <button type="button" disabled={pending} onClick={() => act("booked")} className="btn-ghost btn-sm col-span-2">
              Volver a activar
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}

/* ---------------------------- new appointment dialog ---------------------------- */

function NewAppointmentDialog({
  open,
  onClose,
  services,
  today,
}: {
  open: boolean;
  onClose: () => void;
  services: Props["services"];
  today: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(createAppointmentAction, null);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[] | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    let alive = true;
    if (!serviceId || !date) return;
    slotsAction(serviceId, date).then((s) => alive && setSlots(s));
    return () => {
      alive = false;
    };
  }, [serviceId, date, state]);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  const timeOptions = useMemo(() => slots ?? [], [slots]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="new-apt-title"
      className="m-auto w-[min(560px,calc(100vw-24px))] rounded-[28px] bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <form ref={formRef} action={action} className="p-6 sm:p-8">
        <h2 id="new-apt-title" className="font-display text-2xl font-semibold tracking-tight">
          Nueva cita
        </h2>
        <p className="mt-1 text-sm text-ink-2">Para clientes que llaman o llegan al mostrador.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="na-service" className="label">
              Servicio
            </label>
            <select id="na-service" name="serviceId" value={serviceId} onChange={(e) => (setSlots(null), setServiceId(e.target.value))} className="field">
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="na-date" className="label">
              Fecha
            </label>
            <input id="na-date" name="date" type="date" min={today} value={date} onChange={(e) => (setSlots(null), setDate(e.target.value))} required className="field" />
          </div>
          <div>
            <label htmlFor="na-time" className="label">
              Hora
            </label>
            {slots?.length === 0 ? (
              <>
                <input id="na-time" name="time" type="time" required className="field" />
                <p className="mt-1 text-xs text-muted">No hay espacios libres. Marca “Agendar aunque se cruce”.</p>
              </>
            ) : (
              <select id="na-time" name="time" required className="field" disabled={slots === null} key={`${serviceId}-${date}-${timeOptions.length}`}>
                {slots === null && <option>Buscando…</option>}
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {formatTimeEs(t)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="na-name" className="label">
              Nombre del cliente
            </label>
            <input id="na-name" name="name" required autoComplete="off" className="field" />
          </div>
          <div>
            <label htmlFor="na-phone" className="label">
              Celular
            </label>
            <input id="na-phone" name="phone" type="tel" required placeholder="+57 300 123 4567" className="field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="na-notes" className="label">
              Notas (opcional)
            </label>
            <input id="na-notes" name="notes" className="field" />
          </div>
        </div>

        {state?.error && (
          <p role="alert" className="mt-4 text-sm text-rose">
            {state.error}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="force" className="accent-cobalt" />
            Agendar aunque se cruce
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="btn-primary btn-sm">
              {pending ? "Agendando…" : "Agendar cita"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
