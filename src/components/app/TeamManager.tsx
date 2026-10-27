"use client";

import { useState, useTransition } from "react";
import { createInviteAction, removeMemberAction, revokeInviteAction } from "@/app/app/actions";
import { CopyField } from "./CopyField";

interface Member {
  email: string;
  name: string;
  role: "owner" | "staff";
  google: boolean;
  lastLoginAt: string;
}

export function TeamManager({
  demo,
  me,
  members,
  invites,
}: {
  demo: boolean;
  me: string;
  members: Member[];
  invites: { token: string; expiresAt: string }[];
}) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const invite = () =>
    start(async () => {
      setError(null);
      const res = await createInviteAction();
      if (res.error) setError(res.error);
      else setLink(res.url ?? null);
    });

  return (
    <div className="grid gap-10 px-5 py-6 lg:px-10 xl:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="members-title">
        <h2 id="members-title" className="font-display text-xl font-semibold tracking-tight">
          Personas con acceso
        </h2>
        <ul className="mt-4 divide-y divide-line-soft rounded-2xl border border-line bg-paper">
          {members.length === 0 && <li className="px-5 py-4 text-sm text-muted">{demo ? "En la demostración no hay equipo." : "Solo tú por ahora."}</li>}
          {members.map((m) => (
            <li key={m.email} className="flex items-center gap-4 px-5 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{(m.name || m.email)[0].toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name || m.email}
                  {m.email === me && <span className="ml-2 text-sm font-normal text-muted">(tú)</span>}
                </p>
                <p className="truncate text-sm text-muted">
                  {m.email} · {m.role === "owner" ? "Dueño" : "Equipo"}
                  {m.google ? " · Google" : ""}
                </p>
              </div>
              {m.role === "staff" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`¿Quitar el acceso de ${m.name || m.email}?`)) start(async () => void (await removeMemberAction(m.email)));
                  }}
                  className="btn btn-sm text-rose hover:bg-rose-soft"
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="invite-title" className="space-y-4">
        <h2 id="invite-title" className="font-display text-xl font-semibold tracking-tight">
          Invitar a alguien
        </h2>
        <p className="text-sm text-ink-2">
          Crea un enlace y envíaselo por WhatsApp. Sirve una sola vez y vence en 7 días. Con él, la persona crea su acceso con correo o con Google.
        </p>
        <button type="button" disabled={pending || demo} onClick={invite} className="btn-primary btn-sm">
          {pending ? "Creando…" : "Crear enlace de invitación"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-rose">
            {error}
          </p>
        )}
        {link && (
          <div className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-sm font-medium">Enlace listo</p>
            <CopyField value={link} label="Enlace de invitación" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Te invito al panel de Velora de nuestro negocio: ${link}`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-cobalt hover:underline"
            >
              Enviar por WhatsApp
            </a>
          </div>
        )}
        {invites.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-ink-2">Invitaciones sin usar</h3>
            <ul className="mt-2 divide-y divide-line-soft rounded-2xl border border-line bg-paper text-sm">
              {invites.map((i) => (
                <li key={i.token} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-muted">Vence el {new Date(i.expiresAt).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}</span>
                  <button type="button" disabled={pending} onClick={() => start(() => revokeInviteAction(i.token))} className="text-rose hover:underline">
                    Anular
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
