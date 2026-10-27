"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { saveBusinessStep, saveHoursStep, saveServicesStep, saveTeamStep } from "@/app/app/bienvenida/actions";
import { confetti } from "../fx/confetti";
import { CopyField } from "./CopyField";

type Hours = ({ open: string; close: string; lunch: boolean } | null)[];
type Svc = { id?: string; name: string; durationMinutes: number; price: number; active: boolean };

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const NAMES = ["Sofía", "Valentina", "Camila", "Thierry", "Mateo", "Luna"];

const PRESETS: { label: string; hours: Hours }[] = [
  {
    label: "Lun–Vie 8–6 · Sáb 8–1",
    hours: [null, ...Array(5).fill({ open: "08:00", close: "18:00", lunch: true }), { open: "08:00", close: "13:00", lunch: false }],
  },
  { label: "Lun–Sáb 9–7", hours: [null, ...Array(6).fill({ open: "09:00", close: "19:00", lunch: false })] },
  { label: "Todos los días 8–8", hours: Array(7).fill({ open: "08:00", close: "20:00", lunch: false }) },
];

const STEPS = ["Tu negocio", "Horario", "Servicios", "Equipo", "¡Listo!"];

export function Onboarding(props: {
  firstName: string;
  business: string;
  settings: { phone: string; address: string; assistantName: string };
  hours: Hours;
  services: Svc[];
  staff: string[];
  link: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [info, setInfo] = useState(props.settings);
  const [hours, setHours] = useState<Hours>(props.hours);
  const [services, setServices] = useState<Svc[]>(props.services);
  const [team, setTeam] = useState<string[]>(props.staff);
  const [teamInput, setTeamInput] = useState("");

  const go = (to: number) => {
    setError(null);
    setDir(to > step ? 1 : -1);
    setStep(to);
    if (to === STEPS.length - 1) window.setTimeout(() => confetti(), 350);
  };

  const next = () =>
    start(async () => {
      const save = [
        () => saveBusinessStep(info),
        () => saveHoursStep(hours),
        () => saveServicesStep(services),
        () => saveTeamStep(team),
      ][step];
      const r = save ? await save() : { ok: true };
      if (r.error) return setError(r.error);
      go(step + 1);
    });

  const setDay = (d: number, v: Partial<{ open: string; close: string; lunch: boolean }> | null) =>
    setHours((h) => h.map((x, i) => (i !== d ? x : v === null ? null : { ...(x ?? { open: "08:00", close: "18:00", lunch: false }), ...v })));

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
      <p className="text-sm text-muted">
        Hola {props.firstName} 👋 · Configuremos {props.business} en 2 minutos
      </p>

      {/* progress */}
      <ol className="mt-5 grid grid-cols-5 gap-2" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
              className="group block w-full text-left disabled:cursor-default"
            >
              <span className="block h-1.5 overflow-hidden rounded-full bg-line-soft">
                <motion.span
                  className="block h-full rounded-full bg-gradient-to-r from-cobalt to-mint"
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
              <span className={clsx("mt-2 hidden text-xs sm:block", i === step ? "font-medium text-ink" : "text-muted")}>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="relative mt-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: dir * -60, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[28px] border border-line bg-paper p-6 sm:p-8"
          >
            {step === 0 && (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-tight">Tu negocio</h1>
                <p className="mt-1 text-ink-2">Tu recepcionista lo comparte cuando un cliente pregunta.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ob-phone" className="label">
                      Teléfono
                    </label>
                    <input id="ob-phone" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="+57 300 123 4567" className="field" />
                  </div>
                  <div>
                    <label htmlFor="ob-address" className="label">
                      Dirección
                    </label>
                    <input id="ob-address" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="Calle 10 # 43-12, Medellín" className="field" />
                  </div>
                </div>
                <p className="label mt-6">¿Cómo se llama tu recepcionista?</p>
                <div className="flex flex-wrap gap-2">
                  {NAMES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInfo({ ...info, assistantName: n })}
                      className={clsx(
                        "rounded-full border px-4 py-2 text-sm transition-all duration-300",
                        info.assistantName === n ? "scale-105 border-night bg-night text-white" : "border-line hover:-translate-y-0.5 hover:border-ink-2",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    aria-label="Otro nombre"
                    value={NAMES.includes(info.assistantName) ? "" : info.assistantName}
                    onChange={(e) => setInfo({ ...info, assistantName: e.target.value })}
                    placeholder="Otro nombre…"
                    className="field h-10 w-40 rounded-full py-0"
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-tight">¿Cuándo atiendes?</h1>
                <p className="mt-1 text-ink-2">Solo se ofrecen citas dentro de este horario. Elige uno rápido o ajústalo.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => setHours(p.hours)} className="rounded-full border border-line px-3.5 py-1.5 text-sm transition-all hover:-translate-y-0.5 hover:border-cobalt hover:text-cobalt">
                      {p.label}
                    </button>
                  ))}
                </div>
                <ul className="stagger mt-5 divide-y divide-line-soft rounded-2xl border border-line">
                  {ORDER.map((d) => {
                    const h = hours[d];
                    return (
                      <li key={d} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <label className="flex w-32 items-center gap-2 text-[15px]">
                          <input type="checkbox" checked={!!h} onChange={(e) => setDay(d, e.target.checked ? {} : null)} className="size-4 accent-cobalt" />
                          {DAYS[d]}
                        </label>
                        {h ? (
                          <>
                            <input aria-label={`Abre ${DAYS[d]}`} type="time" value={h.open} onChange={(e) => setDay(d, { open: e.target.value })} className="field h-9 w-32 py-0" />
                            <span className="text-muted">a</span>
                            <input aria-label={`Cierra ${DAYS[d]}`} type="time" value={h.close} onChange={(e) => setDay(d, { close: e.target.value })} className="field h-9 w-32 py-0" />
                            <label className="ml-auto flex items-center gap-2 text-sm text-ink-2" data-tip="Bloquea de 12:30 a 2:00 p. m.">
                              <input type="checkbox" checked={h.lunch} onChange={(e) => setDay(d, { lunch: e.target.checked })} className="accent-cobalt" />
                              Almuerzo
                            </label>
                          </>
                        ) : (
                          <span className="text-sm text-muted">Cerrado</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-tight">Tus servicios</h1>
                <p className="mt-1 text-ink-2">Los preparamos según tu tipo de negocio. Ajusta precios y duración, o desactiva los que no ofreces.</p>
                <ul className="stagger mt-5 space-y-2">
                  {services.map((s, i) => (
                    <li key={s.id ?? `new-${i}`} className={clsx("grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-line p-3 transition-opacity sm:grid-cols-[auto_1fr_110px_140px]", !s.active && "opacity-50")}>
                      <input
                        type="checkbox"
                        aria-label={`Ofrecer ${s.name}`}
                        checked={s.active}
                        onChange={(e) => setServices((list) => list.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))}
                        className="size-4 accent-cobalt"
                      />
                      <input
                        aria-label="Nombre"
                        value={s.name}
                        onChange={(e) => setServices((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        className="field"
                      />
                      <label className="col-span-2 flex items-center gap-1 text-sm text-muted sm:col-span-1">
                        <input
                          aria-label="Minutos"
                          type="number"
                          min={5}
                          step={5}
                          value={s.durationMinutes}
                          onChange={(e) => setServices((list) => list.map((x, j) => (j === i ? { ...x, durationMinutes: Number(e.target.value) } : x)))}
                          className="field"
                        />
                        min
                      </label>
                      <label className="col-span-2 flex items-center gap-1 text-sm text-muted sm:col-span-1">
                        $
                        <input
                          aria-label="Precio"
                          type="number"
                          min={0}
                          step={1000}
                          value={s.price}
                          onChange={(e) => setServices((list) => list.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))}
                          className="field"
                        />
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setServices((l) => [...l, { name: "Nuevo servicio", durationMinutes: 30, price: 0, active: true }])}
                  className="mt-3 text-sm font-medium text-cobalt hover:underline"
                >
                  + Agregar otro servicio
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-tight">¿Quién atiende?</h1>
                <p className="mt-1 text-ink-2">Cada persona tiene su propia agenda. Si trabajas solo, puedes saltar este paso.</p>
                <form
                  className="mt-5 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = teamInput.trim();
                    if (n.length >= 2 && !team.includes(n)) setTeam([...team, n]);
                    setTeamInput("");
                  }}
                >
                  <input value={teamInput} onChange={(e) => setTeamInput(e.target.value)} placeholder="Ej.: Dra. Ana Ruiz" aria-label="Nombre del profesional" className="field" />
                  <button type="submit" className="btn-ghost shrink-0">
                    Agregar
                  </button>
                </form>
                <ul className="mt-4 flex flex-wrap gap-2">
                  <AnimatePresence>
                    {team.map((n, i) => (
                      <motion.li
                        key={n}
                        layout
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="flex items-center gap-2 rounded-full bg-cobalt-soft py-1.5 pr-1.5 pl-3 text-sm text-cobalt"
                      >
                        <span className="size-2 rounded-full" style={{ background: ["#2b4cff", "#14b88a", "#e9a23b", "#f0475b", "#7c3aed", "#0ea5e9"][i % 6] }} />
                        {n}
                        {!props.staff.includes(n) && (
                          <button type="button" onClick={() => setTeam(team.filter((x) => x !== n))} aria-label={`Quitar a ${n}`} className="grid size-5 place-items-center rounded-full hover:bg-cobalt/15">
                            ×
                          </button>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            )}

            {step === 4 && (
              <div className="text-center">
                <span aria-hidden className="mx-auto grid size-20 animate-[float_4s_ease-in-out_infinite] place-items-center rounded-3xl bg-gradient-to-br from-cobalt to-mint text-4xl shadow-[0_20px_40px_-16px_var(--color-cobalt)]">
                  🎉
                </span>
                <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">¡{info.assistantName} está lista para atender!</h1>
                <p className="mx-auto mt-2 max-w-md text-ink-2">Comparte tu enlace en Instagram, Google Maps y tu estado de WhatsApp. Las citas llegan solas a tu agenda.</p>
                <div className="mx-auto mt-6 max-w-md text-left">
                  <CopyField value={props.link} label="Tu enlace de reservas" />
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`¡Ya puedes agendar tu cita en ${props.business} a cualquier hora! 👉 ${props.link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn bg-mint text-white hover:brightness-110"
                  >
                    Compartir por WhatsApp
                  </a>
                  <button type="button" onClick={() => router.push("/app/probar")} className="btn-ghost">
                    Probar a {info.assistantName}
                  </button>
                  <button type="button" onClick={() => router.push("/app")} className="btn-primary">
                    Ir a mi panel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-5 text-sm text-rose">
                {error}
              </p>
            )}

            {step < 4 && (
              <div className="mt-8 flex items-center justify-between gap-3">
                {step > 0 ? (
                  <button type="button" onClick={() => go(step - 1)} className="text-sm text-muted hover:text-ink">
                    ← Atrás
                  </button>
                ) : (
                  <button type="button" onClick={() => router.push("/app")} className="text-sm text-muted hover:text-ink">
                    Hacerlo después
                  </button>
                )}
                <button type="button" disabled={pending} onClick={next} className="btn-primary">
                  {pending ? "Guardando…" : step === 3 ? (team.length ? "Guardar y terminar" : "Saltar y terminar") : "Continuar →"}
                </button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
