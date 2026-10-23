"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { RichText } from "./RichText";

interface ChatMessage {
  id: string;
  role: "customer" | "assistant" | "staff";
  text: string;
}

const STORAGE_KEY = "velora:demo-conversation";

const SUGGESTIONS = [
  "Quiero una limpieza mañana a las 10",
  "¿Cuánto cuesta el blanqueamiento?",
  "Me duele una muela, ¿tienen hoy?",
  "¿Cuál es el horario?",
];

function readStoredId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — keep it in memory only */
  }
}

/** Live chat with the receptionist, backed by /api/chat. */
export function ChatWidget({ greeting, assistantName = "Sofía" }: { greeting: string; assistantName?: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "greet", role: "assistant", text: greeting }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore an earlier session so a refresh doesn't lose the thread.
  useEffect(() => {
    const id = readStoredId();
    if (!id) return;
    fetch(`/api/chat?conversationId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data: { messages: ChatMessage[] }) => {
        if (data.messages?.length) {
          setConversationId(id);
          setMessages([{ id: "greet", role: "assistant", text: greeting }, ...data.messages]);
        } else storeId(null);
      })
      .catch(() => undefined);
  }, [greeting]);

  // Pick up replies typed by the business team from the dashboard.
  useEffect(() => {
    if (!conversationId) return;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(conversationId)}`);
        const data = (await res.json()) as { messages: ChatMessage[] };
        if (pendingRef.current || !data.messages) return;
        // Only adopt the server copy when it has messages we haven't shown (staff replies).
        setMessages((current) =>
          data.messages.length > current.length - 1 ? [{ id: "greet", role: "assistant", text: greeting }, ...data.messages] : current,
        );
      } catch {
        /* offline — try again on the next tick */
      }
    }, 6000);
    return () => window.clearInterval(id);
  }, [conversationId, greeting]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || pending) return;
      setError(null);
      setEvent(null);
      setInput("");
      setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "customer", text: message }]);
      setPending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: conversationId ?? undefined, message }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error");
        setConversationId(data.conversationId);
        storeId(data.conversationId);
        if (data.reply) setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: data.reply }]);
        else
          setMessages((m) => [
            ...m,
            { id: `a-${Date.now()}`, role: "assistant", text: "Tu mensaje le llegó al equipo. Te responderán por aquí en breve." },
          ]);
        if (data.event) setEvent(data.event);
      } catch (err) {
        setError((err as Error).message || "No pudimos enviar tu mensaje.");
      } finally {
        setPending(false);
        inputRef.current?.focus();
      }
    },
    [conversationId, pending],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const reset = () => {
    storeId(null);
    setConversationId(null);
    setMessages([{ id: "greet", role: "assistant", text: greeting }]);
    setEvent(null);
    setError(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-line bg-paper shadow-[0_40px_90px_-50px_rgba(14,27,61,.55)]">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative grid size-10 place-items-center rounded-full bg-ink font-display text-sm font-semibold text-white">
            {assistantName[0]}
            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-paper bg-mint" />
          </div>
          <div>
            <p className="text-[15px] font-semibold">{assistantName}</p>
            <p className="text-xs text-muted">{pending ? "escribiendo…" : "Responde al instante"}</p>
          </div>
        </div>
        <button type="button" onClick={reset} className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-porcelain hover:text-ink">
          Nueva conversación
        </button>
      </div>

      <div ref={scroller} data-lenis-prevent className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-porcelain/60 px-4 py-5" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout="position"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={clsx(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-line",
                m.role === "customer"
                  ? "self-end rounded-br-md bg-ink text-white"
                  : m.role === "staff"
                    ? "self-start rounded-bl-md border border-amber/40 bg-amber-soft text-ink"
                    : "self-start rounded-bl-md border border-line-soft bg-paper text-ink",
              )}
            >
              {m.role === "staff" && <span className="mb-1 block text-xs font-medium text-ink-2">Equipo de la clínica</span>}
              <RichText text={m.text} />
            </motion.div>
          ))}
          {pending && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex w-fit gap-1 self-start rounded-2xl rounded-bl-md border border-line-soft bg-paper px-4 py-3"
              aria-label={`${assistantName} está escribiendo`}
            >
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {event === "booked" && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-mint-soft px-5 text-sm text-ink"
          >
            <span className="block py-2.5">
              Esta cita ya aparece en el panel. Entra con la contraseña de demostración para verla.
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-line-soft px-4 pt-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-cobalt hover:text-cobalt"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-center gap-2 px-4 pt-3 pb-4">
        <label htmlFor="chat-input" className="sr-only">
          Escribe tu mensaje
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe como lo harías por WhatsApp…"
          maxLength={600}
          autoComplete="off"
          className="field rounded-full"
        />
        <button type="submit" disabled={!input.trim() || pending} className="btn-cobalt size-11 shrink-0 p-0" aria-label="Enviar mensaje">
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
            <path d="M3 10h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      {error && <p className="px-5 pb-3 text-sm text-rose" role="alert">{error}</p>}
    </div>
  );
}
