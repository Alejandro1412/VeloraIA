"use client";

import { useId, useMemo, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect } from "react";

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.round(n));

function AnimatedMoney({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const [shown, setShown] = useState(value);
  useMotionValueEvent(mv, "change", (v) => setShown(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, value]);
  return <>{money(shown)}</>;
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const pct = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[15px] text-white/70">
          {props.label}
        </label>
        <output htmlFor={id} className="tabular font-display text-xl font-semibold">
          {props.format(props.value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cobalt [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
        style={{ background: `linear-gradient(to right, var(--color-cobalt) ${pct}%, rgba(255,255,255,.15) ${pct}%)` }}
      />
    </div>
  );
}

export function RoiCalculator() {
  const [appointments, setAppointments] = useState(320);
  const [ticket, setTicket] = useState(110000);
  const [noShow, setNoShow] = useState(15);
  const [reduction, setReduction] = useState(40);
  const [afterHours, setAfterHours] = useState(8);
  const plan = 449000;

  const r = useMemo(() => {
    const recoveredNoShows = appointments * (noShow / 100) * (reduction / 100);
    const extraBookings = appointments * (afterHours / 100);
    const monthly = (recoveredNoShows + extraBookings) * ticket;
    return { recoveredNoShows, extraBookings, monthly, net: monthly - plan, multiple: monthly / plan };
  }, [appointments, ticket, noShow, reduction, afterHours]);

  return (
    <section id="ahorro" aria-labelledby="roi-title" className="bg-ink py-24 text-white sm:py-32">
      <div className="mx-auto max-w-[1240px] px-5">
        <h2 id="roi-title" className="max-w-3xl font-display text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1] font-semibold tracking-[-0.03em]">
          ¿Cuánto dinero se te va en citas perdidas?
        </h2>
        <p className="mt-5 max-w-xl text-lg text-white/70">Mueve los valores con los números de tu negocio. El cálculo es tuyo, no una promesa nuestra.</p>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <div className="space-y-9">
            <Slider label="Citas al mes" value={appointments} min={40} max={1500} step={10} format={(v) => `${v}`} onChange={setAppointments} />
            <Slider label="Valor promedio por cita" value={ticket} min={20000} max={600000} step={5000} format={money} onChange={setTicket} />
            <Slider label="Inasistencias hoy" value={noShow} min={0} max={40} step={1} format={(v) => `${v}%`} onChange={setNoShow} />
            <Slider
              label="Cuántas inasistencias evitan los recordatorios"
              value={reduction}
              min={0}
              max={80}
              step={5}
              format={(v) => `${v}%`}
              onChange={setReduction}
            />
            <Slider
              label="Citas extra por responder fuera de horario"
              value={afterHours}
              min={0}
              max={25}
              step={1}
              format={(v) => `${v}%`}
              onChange={setAfterHours}
            />
          </div>

          <div className="flex flex-col justify-between rounded-[28px] bg-paper p-8 text-ink sm:p-10">
            <div>
              <p className="text-[15px] text-muted">Ingresos que recuperas al mes</p>
              <p className="tabular mt-2 font-display text-[clamp(2.6rem,5.4vw,4.4rem)] leading-none font-semibold tracking-[-0.03em]" aria-live="polite">
                <AnimatedMoney value={r.monthly} />
              </p>
              <dl className="mt-9 space-y-4 border-t border-line pt-6 text-[15px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-2">Inasistencias evitadas</dt>
                  <dd className="tabular font-medium">{Math.round(r.recoveredNoShows)} citas</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-2">Citas nuevas fuera de horario</dt>
                  <dd className="tabular font-medium">{Math.round(r.extraBookings)} citas</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-2">Plan Profesional</dt>
                  <dd className="tabular font-medium">−{money(plan)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line pt-4 text-base">
                  <dt className="font-medium">Ganancia neta al mes</dt>
                  <dd className={"tabular font-semibold " + (r.net >= 0 ? "text-mint" : "text-rose")}>
                    <AnimatedMoney value={r.net} />
                  </dd>
                </div>
              </dl>
            </div>
            <p className="mt-8 text-sm text-muted">
              {r.multiple >= 1
                ? `Velora se paga ${r.multiple.toFixed(1).replace(".", ",")} veces con estos números.`
                : "Con estos números el plan Esencial puede ser suficiente para empezar."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
