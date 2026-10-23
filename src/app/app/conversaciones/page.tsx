import Link from "next/link";
import { Suspense } from "react";
import { clsx } from "clsx";
import { requireSession } from "@/lib/auth";
import { getConversation, getSettings, listConversations, listMessages } from "@/lib/data/store";
import { formatTimeEs, localParts, relativeDayEs } from "@/lib/domain/time";
import { CHANNEL_LABEL } from "@/lib/domain/types";
import { Empty, PageHeader, PageSkeleton } from "@/components/app/ui";
import { ConversationPanel } from "@/components/app/ConversationPanel";
import { AutoRefresh } from "@/components/app/AutoRefresh";

export default function ConversationsPage({ searchParams }: PageProps<"/app/conversaciones">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conversations searchParams={searchParams} />
    </Suspense>
  );
}

async function Conversations({ searchParams }: { searchParams: PageProps<"/app/conversaciones">["searchParams"] }) {
  await requireSession();
  const params = await searchParams;
  const [settings, conversations] = await Promise.all([getSettings(), listConversations(100)]);
  const selectedId = typeof params.c === "string" ? params.c : undefined;
  const selected = selectedId ? await getConversation(selectedId) : null;
  const messages = selected ? await listMessages(selected.id, 200) : [];
  const today = localParts(new Date(), settings.utcOffsetMinutes).date;

  const stamp = (iso: string) => {
    const p = localParts(iso, settings.utcOffsetMinutes);
    return p.date === today ? formatTimeEs(p.time) : relativeDayEs(p.date, today).split(" ").slice(0, 2).join(" ");
  };

  return (
    <>
      <AutoRefresh seconds={8} />
      <PageHeader title="Conversaciones" description="Todo lo que tus clientes escriben, y lo que Sofía responde." />
      <div className="grid min-h-[calc(100dvh-140px)] lg:grid-cols-[360px_1fr]">
        <ul className={clsx("border-line lg:border-r", selected && "hidden lg:block")} aria-label="Conversaciones">
          {conversations.length === 0 && (
            <li className="p-5">
              <Empty title="Aún no hay conversaciones">Escribe en el chat de la página principal para ver la primera.</Empty>
            </li>
          )}
          {conversations.map((c) => (
            <li key={c.id} className="border-b border-line-soft">
              <Link
                href={`/app/conversaciones?c=${c.id}`}
                aria-current={c.id === selected?.id ? "true" : undefined}
                className={clsx("flex gap-3 px-5 py-4 transition-colors hover:bg-paper", c.id === selected?.id && "bg-paper")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/90 text-sm font-semibold text-white">
                  {(c.customerName || "W")[0].toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={clsx("truncate", c.unread ? "font-semibold" : "font-medium")}>{c.customerName || "Visitante web"}</span>
                    <span className="shrink-0 text-xs text-muted">{stamp(c.updatedAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    {CHANNEL_LABEL[c.channel]}
                    {c.humanTakeover && <span className="rounded-full bg-amber-soft px-1.5 py-px text-[#8a5a12]">Tu equipo responde</span>}
                  </span>
                  <span className="mt-1 block truncate text-sm text-ink-2">{c.lastMessage}</span>
                </span>
                {c.unread > 0 && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-cobalt" aria-label={`${c.unread} sin leer`} />}
              </Link>
            </li>
          ))}
        </ul>

        <section className={clsx("min-w-0", !selected && "hidden lg:block")}>
          {selected ? (
            <ConversationPanel
              key={selected.id}
              conversation={{
                id: selected.id,
                name: selected.customerName || "Visitante web",
                phone: selected.customerPhone,
                channel: selected.channel,
                humanTakeover: selected.humanTakeover,
                unread: selected.unread,
              }}
              assistantName={settings.assistantName}
              messages={messages.map((m) => ({ id: m.id, role: m.role, text: m.text, time: stamp(m.createdAt) }))}
            />
          ) : (
            <div className="grid h-full place-items-center p-10 text-center text-muted">
              <p>Elige una conversación para leerla o responder.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
