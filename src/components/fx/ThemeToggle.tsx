"use client";

import { useSyncExternalStore } from "react";
import { clsx } from "clsx";

import { THEME_KEY as KEY } from "./theme";

const isDark = () => document.documentElement.classList.contains("dark");
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};

/** Light/dark switch with a circular reveal from the button (View Transitions API). */
export function ThemeToggle({ className, label = false }: { className?: string; label?: boolean }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !document.documentElement.classList.contains("dark");
    const apply = () => {
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem(KEY, next ? "dark" : "light");
      } catch {}
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || reduce) return apply();

    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  const text = dark ? "Modo claro" : "Modo oscuro";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={text}
      aria-pressed={dark}
      data-tip={label ? undefined : text}
      className={clsx(
        "group inline-flex items-center gap-3 rounded-full text-ink-2 transition-colors hover:text-ink",
        label ? "w-full rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-porcelain" : "size-10 justify-center hover:bg-line-soft",
        className,
      )}
    >
      <span className="relative grid size-[18px] place-items-center">
        {/* sun */}
        <svg
          viewBox="0 0 24 24"
          className={clsx("absolute size-[18px] transition-all duration-500 ease-out", dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        {/* moon */}
        <svg
          viewBox="0 0 24 24"
          className={clsx("absolute size-[18px] transition-all duration-500 ease-out", dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      </span>
      {label && <span>{text}</span>}
    </button>
  );
}
