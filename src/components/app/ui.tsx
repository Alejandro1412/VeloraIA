import { clsx } from "clsx";
import type { ReactNode } from "react";
import { CHANNEL_LABEL, STATUS_LABEL, type AppointmentStatus, type Channel } from "@/lib/domain/types";

const statusTone: Record<AppointmentStatus, string> = {
  booked: "bg-cobalt-soft text-cobalt",
  confirmed: "bg-mint-soft text-[#0b7a5b]",
  completed: "bg-line-soft text-ink-2",
  cancelled: "bg-rose-soft text-[#b4233a]",
  no_show: "bg-amber-soft text-[#8a5a12]",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusTone[status])}>{STATUS_LABEL[status]}</span>;
}

export function ChannelTag({ channel }: { channel: Channel }) {
  return <span className="text-xs text-muted">{CHANNEL_LABEL[channel]}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line px-5 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between lg:px-10 lg:pt-10">
      <div>
        <h1 className="font-display text-[32px] leading-none font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse px-5 py-8 lg:px-10" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-56 rounded-lg bg-line-soft" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-line-soft" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-line-soft" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-2xl bg-line-soft" />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}
