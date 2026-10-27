"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function toBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Registers the service worker for every panel page. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);
  return null;
}

/** "Install the app" + "notify me on this device" controls. */
export function PushControls({ demo }: { demo: boolean }) {
  const [support, setSupport] = useState<"checking" | "yes" | "no" | "ios-install">("checking");
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [install, setInstall] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = window.setTimeout(async () => {
      setInstalled(standalone);
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setSupport(ios && !standalone ? "ios-install" : "no");
      setSupport("yes");
      const reg = await navigator.serviceWorker.ready;
      setOn(!!(await reg.pushManager.getSubscription()));
    }, 0);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(t);
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permiso denegado. Actívalo en la configuración del navegador para este sitio.");
      const { publicKey } = await fetch("/api/push").then((r) => r.json());
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) });
      const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se pudo activar");
      setOn(true);
      setMsg("¡Listo! Te avisaremos aquí de citas nuevas, cancelaciones y clientes que piden ayuda.");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setOn(false);
    setBusy(false);
    setMsg("Notificaciones desactivadas en este dispositivo.");
  };

  return (
    <div className="spotlight flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-paper p-4">
      <span aria-hidden className={clsx("grid size-11 shrink-0 place-items-center rounded-2xl text-xl", on ? "bg-mint-soft" : "bg-cobalt-soft")}>
        {on ? "🔔" : "📲"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{on ? "Notificaciones activas en este dispositivo" : "Recibe los avisos al instante"}</p>
        <p className="text-sm text-muted">
          {support === "ios-install"
            ? "En iPhone: toca Compartir → “Agregar a inicio”, abre Velora desde ese ícono y vuelve aquí."
            : support === "no"
              ? "Este navegador no permite notificaciones. Prueba con Chrome, Edge o Safari actualizado."
              : demo
                ? "Disponible en tu propia cuenta (no en la demostración)."
                : "Como una app: te llega la alerta aunque tengas Velora cerrado."}
        </p>
        {msg && <p className="mt-1 text-sm text-ink-2">{msg}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {install && !installed && (
          <button
            type="button"
            onClick={async () => {
              await install.prompt();
              const choice = await install.userChoice;
              if (choice.outcome === "accepted") setInstalled(true);
              setInstall(null);
            }}
            className="btn-ghost btn-sm"
          >
            Instalar app
          </button>
        )}
        {support === "yes" && !demo && (
          <button type="button" disabled={busy} onClick={on ? disable : enable} className={on ? "btn-ghost btn-sm" : "btn-primary btn-sm"}>
            {busy ? "…" : on ? "Desactivar" : "Activar notificaciones"}
          </button>
        )}
      </div>
    </div>
  );
}
