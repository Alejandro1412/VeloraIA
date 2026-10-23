import { clsx } from "clsx";

/** Velora mark: an appointment slot whose check stroke draws the V. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const fg = inverted ? "var(--color-ink)" : "var(--color-porcelain)";
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={clsx("shrink-0", inverted ? "text-white" : "text-ink", className)}>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="currentColor" />
      <path d="M8.5 10.5h15" stroke={fg} strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 15.5l5.4 7 8.6-12"
        fill="none"
        stroke={fg}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  showByline = false,
  inverted = false,
}: {
  className?: string;
  showByline?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" inverted={inverted} />
      <span className="font-display text-[21px] font-semibold tracking-[-0.03em]">Velora</span>
      {showByline && <span className="hidden text-xs text-muted sm:inline">by IONEX</span>}
    </span>
  );
}
