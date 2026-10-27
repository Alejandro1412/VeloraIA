"use client";

import { useEffect, useRef } from "react";

/** Counts from 0 to the number inside `value` ("42", "87%", "—") once it scrolls into view. */
export function CountUp({ value, duration = 1100 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, num, post] = match;
    const target = Number(num.replace(",", "."));
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = `${pre}${Math.round(target * eased)}${post}`;
        if (p < 1) raf = requestAnimationFrame(tick);
        else el.textContent = value;
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration, match]);

  return <span ref={ref}>{value}</span>;
}
