"use client";

import { useRef, type ReactNode } from "react";

/** Pulls its child slightly toward the cursor, then springs back. */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transition = "transform 150ms ease-out";
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const leave = () => {
    const el = ref.current!;
    el.style.transition = "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.transform = "";
  };
  return (
    <span ref={ref} onPointerMove={move} onPointerLeave={leave} className="inline-flex">
      {children}
    </span>
  );
}
