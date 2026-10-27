"use client";

import { useActionState, useState } from "react";
import { saveWompiAction } from "@/app/app/actions";
import { CopyField } from "./CopyField";

export function WompiForm({ connected, publicKey, webhookUrl, demo }: { connected: boolean; publicKey: string; webhookUrl: string; demo: boolean }) {
  const [state, action, pending] = useActionState(saveWompiAction, null);
  const [editing, setEditing] = useState(!connected);

  if (connected && !editing) {
    return (
      <div className="mt-4 space-y-3">
        <p className="flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full bg-mint" aria-hidden />
          Conectado · <span className="font-mono text-xs">{publicKey.slice(0, 16)}…</span>
        </p>
        <div>
          <p className="text-sm text-ink-2">En Wompi → Desarrolladores → URL de eventos, pega:</p>
          <CopyField value={webhookUrl} label="URL de eventos de Wompi" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="btn-ghost btn-sm">
            Cambiar llaves
          </button>
          <form action={action}>
            <input type="hidden" name="disconnect" value="1" />
            <button type="submit" disabled={pending} className="btn btn-sm text-rose hover:bg-rose-soft">
              Desconectar
            </button>
          </form>
        </div>
        {state?.message && <p className="text-sm text-mint">{state.message}</p>}
      </div>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-3">
      <p className="text-sm text-ink-2">
        En tu panel de Wompi, entra a <em>Desarrolladores</em> y copia tus llaves. Los secretos se guardan solo en el servidor y no vuelven a mostrarse.
      </p>
      <div>
        <label htmlFor="wompiPublicKey" className="label">
          Llave pública
        </label>
        <input id="wompiPublicKey" name="wompiPublicKey" required defaultValue={publicKey} placeholder="pub_prod_…" autoComplete="off" className="field font-mono text-[13px]" disabled={demo} />
      </div>
      <div>
        <label htmlFor="wompiIntegritySecret" className="label">
          Secreto de integridad
        </label>
        <input id="wompiIntegritySecret" name="wompiIntegritySecret" type="password" required placeholder="prod_integrity_…" autoComplete="off" className="field font-mono text-[13px]" disabled={demo} />
      </div>
      <div>
        <label htmlFor="wompiEventsSecret" className="label">
          Secreto de eventos
        </label>
        <input id="wompiEventsSecret" name="wompiEventsSecret" type="password" required placeholder="prod_events_…" autoComplete="off" className="field font-mono text-[13px]" disabled={demo} />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || demo} className="btn-primary btn-sm">
          {pending ? "Conectando…" : "Conectar Wompi"}
        </button>
        {connected && (
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost btn-sm">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
