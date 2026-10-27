import { clsx } from "clsx";
import type { ReactNode } from "react";
import { BackButton, HelpPanel, type HelpStep } from "./PageChrome";
import { CHANNEL_LABEL, STATUS_LABEL, type AppointmentStatus, type Channel } from "@/lib/domain/types";

const statusTone: Record<AppointmentStatus, string> = {
  booked: "bg-cobalt-soft text-cobalt",
  confirmed: "bg-mint-soft text-mint-ink",
  completed: "bg-line-soft text-ink-2",
  cancelled: "bg-rose-soft text-rose-ink",
  no_show: "bg-amber-soft text-amber-ink",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusTone[status])}>{STATUS_LABEL[status]}</span>;
}

export function ChannelTag({ channel }: { channel: Channel }) {
  return <span className="text-xs text-muted">{CHANNEL_LABEL[channel]}</span>;
}

export function PageHeader({
  title,
  description,
  actions,
  back = "/app",
  help,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Where "Volver" goes when there is no history; false hides it. */
  back?: string | false;
  help?: { id: string; steps: HelpStep[] };
}) {
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-line px-5 pt-6 pb-6 sm:flex-row sm:items-end sm:justify-between lg:px-10 lg:pt-8">
        <div className="animate-[rise_700ms_var(--ease-out-expo)_both]">
          {back !== false && (
            <div className="mb-3">
              <BackButton fallback={back} />
            </div>
          )}
          <h1 className="font-display text-[32px] leading-none font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 text-[15px] text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 animate-[rise_700ms_var(--ease-out-expo)_120ms_both]">{actions}</div>}
      </header>
      {help && <HelpPanel id={help.id} steps={help.steps} />}
    </>
  );
}

export function PageSkeleton() {
  return (
    <div className="px-5 py-8 lg:px-10" aria-busy="true" aria-label="Cargando">
      <div className="shimmer h-9 w-56 rounded-lg" />
      <div className="shimmer mt-3 h-4 w-80 max-w-full rounded" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-28 rounded-2xl" />
        ))}
      </div>
      <div className="shimmer mt-6 h-72 rounded-2xl" />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="animate-[rise_700ms_var(--ease-out-expo)_both] rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span aria-hidden className="mx-auto mb-4 grid size-14 animate-[float_4s_ease-in-out_infinite] place-items-center rounded-2xl bg-gradient-to-br from-cobalt-soft to-mint-soft text-2xl">✨</span>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}
