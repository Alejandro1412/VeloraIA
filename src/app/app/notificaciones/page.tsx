import Link from "next/link";
import { Suspense } from "react";
import { clsx } from "clsx";
import { requireSession } from "@/lib/auth";
import { getSettings, listNotifications } from "@/lib/data/store";
import { formatTimeEs, localParts, relativeDayEs } from "@/lib/domain/time";
import { Empty, PageHeader, PageSkeleton } from "@/components/app/ui";
import { AutoRefresh } from "@/components/app/AutoRefresh";
import { markNotificationsReadAction } from "../actions";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Notifications />
    </Suspense>
  );
}

const DOT: Record<string, string> = {
  booked: "bg-cobalt",
  rescheduled: "bg-amber",
  cancelled: "bg-rose",
  handoff: "bg-ink",
  deposit_paid: "bg-mint",
  waitlist: "bg-mint",
};

async function Notifications() {
  await requireSession();
  const [items, settings] = await Promise.all([listNotifications(100), getSettings()]);
  const today = localParts(new Date(), settings.utcOffsetMinutes).date;
  const unread = items.filter((n) => !n.read).length;
  const when = (iso: string) => {
    const p = localParts(iso, settings.utcOffsetMinutes);
    return `${p.date === today ? "Hoy" : relativeDayEs(p.date, today).split(" ").slice(0, 3).join(" ")}, ${formatTimeEs(p.time)}`;
  };

  return (
    <>
      <AutoRefresh seconds={15} />
      <PageHeader
        title="Avisos"
        description="Citas nuevas, cambios y clientes que piden hablar con tu equipo."
        actions={
          unread > 0 ? (
            <form action={markNotificationsReadAction}>
              <button type="submit" className="btn-ghost btn-sm">
                Marcar todo como leído
              </button>
            </form>
          ) : undefined
        }
      />
      <div className="px-5 py-6 lg:px-10">
        {items.length === 0 ? (
          <Empty title="Sin avisos todavía">Cuando un cliente agende, cancele o pida hablar con una persona, lo verás aquí.</Empty>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-paper">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className={clsx("flex gap-4 px-5 py-4 hover:bg-porcelain/60", !n.read && "bg-cobalt-soft/40")}>
                  <span className={clsx("mt-1.5 size-2.5 shrink-0 rounded-full", DOT[n.kind] ?? "bg-muted")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block", !n.read && "font-semibold")}>{n.title}</span>
                    <span className="block truncate text-sm text-ink-2">{n.body}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{when(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
