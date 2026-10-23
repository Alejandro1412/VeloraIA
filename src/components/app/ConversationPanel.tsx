"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { clsx } from "clsx";
import { markReadAction, setTakeoverAction, staffReplyAction } from "@/app/app/actions";
import { CHANNEL_LABEL, type Channel, type MessageRole } from "@/lib/domain/types";
import { RichText } from "../chat/RichText";

interface Props {
  conversation: { id: string; name: string; phone: string; channel: Channel; humanTakeover: boolean; unread: number };
  assistantName: string;
  messages: { id: string; role: MessageRole; text: string; time: string }[];
}

export function ConversationPanel({ conversation: c, assistantName, messages }: Props) {
  const [state, action, pending] = useActionState(staffReplyAction.bind(null, c.id), null);
  const [toggling, startToggle] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (c.unread) void markReadAction(c.id);
  }, [c.id, c.unread]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length]);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  const phoneDigits = c.phone.replace(/\D/g, "");

  return (
    <div className="flex h-[calc(100dvh-140px)] flex-col max-lg:h-[calc(100dvh-210px)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/app/conversaciones" className="rounded-full p-1.5 text-muted hover:bg-porcelain lg:hidden" aria-label="Volver a la lista">
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path d="M12 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h2 className="font-semibold">{c.name}</h2>
            <p className="text-sm text-muted">
              {CHANNEL_LABEL[c.channel]}
              {phoneDigits && c.channel !== "web" ? ` · ${c.phone}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx("text-sm", c.humanTakeover ? "text-[#8a5a12]" : "text-mint")}>
            {c.humanTakeover ? "Respondes tú" : `${assistantName} responde`}
          </span>
          <button
            type="button"
            disabled={toggling}
            onClick={() => startToggle(() => setTakeoverAction(c.id, !c.humanTakeover))}
            className="btn-ghost btn-sm"
          >
            {c.humanTakeover ? `Devolver a ${assistantName}` : "Tomar la conversación"}
          </button>
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-porcelain/60 px-5 py-6 lg:px-8">
        {messages.map((m) => (
          <div key={m.id} className={clsx("flex flex-col", m.role === "customer" ? "items-start" : "items-end")}>
            <div
              className={clsx(
                "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-line",
                m.role === "customer" && "rounded-bl-md border border-line-soft bg-paper",
                m.role === "assistant" && "rounded-br-md bg-ink text-white",
                m.role === "staff" && "rounded-br-md bg-amber-soft text-ink",
              )}
            >
              <RichText text={m.text} />
            </div>
            <span className="mt-1 px-1 text-[11px] text-muted">
              {m.role === "assistant" ? assistantName : m.role === "staff" ? "Tu equipo" : c.name} · {m.time}
            </span>
          </div>
        ))}
      </div>

      <form ref={form} action={action} className="border-t border-line bg-paper px-5 py-4 lg:px-8">
        <div className="flex items-end gap-2">
          <label htmlFor="reply" className="sr-only">
            Responder como tu equipo
          </label>
          <textarea
            id="reply"
            name="text"
            rows={1}
            required
            placeholder={c.humanTakeover ? "Escribe tu respuesta…" : `Al responder, ${assistantName} dejará de contestar este chat`}
            className="field max-h-40 min-h-11 resize-none rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button type="submit" disabled={pending} className="btn-primary btn-sm h-11">
            {pending ? "Enviando…" : "Enviar"}
          </button>
        </div>
        {state?.error && (
          <p role="alert" className="mt-2 text-sm text-rose">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
