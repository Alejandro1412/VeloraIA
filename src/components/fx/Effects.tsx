"use client";

import { useEffect } from "react";

/**
 * Global, very light interaction layer:
 * - feeds the cursor position to `.spotlight` cards (CSS draws the glow)
 * - adds a ripple to every button press
 */
export function Effects() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".spotlight") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    const onDown = (e: PointerEvent) => {
      if (reduce) return;
      const btn = (e.target as Element | null)?.closest?.("button, .btn-primary, .btn-cobalt, .btn-ghost, [data-ripple]") as HTMLElement | null;
      if (!btn || (btn as HTMLButtonElement).disabled) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const dot = document.createElement("span");
      dot.setAttribute("aria-hidden", "true");
      Object.assign(dot.style, {
        position: "absolute",
        left: `${e.clientX - r.left - size / 2}px`,
        top: `${e.clientY - r.top - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "9999px",
        background: "currentColor",
        opacity: "0.18",
        pointerEvents: "none",
        transform: "scale(0)",
      });
      const cs = getComputedStyle(btn);
      if (cs.position === "static") btn.style.position = "relative";
      if (cs.overflow !== "hidden") btn.style.overflow = "hidden";
      btn.appendChild(dot);
      dot
        .animate([{ transform: "scale(0)", opacity: 0.22 }, { transform: "scale(1)", opacity: 0 }], { duration: 650, easing: "cubic-bezier(0.16,1,0.3,1)" })
        .finished.finally(() => dot.remove());
    };

    if (fine) document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);
  return null;
}
