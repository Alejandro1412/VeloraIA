import { Fragment } from "react";

/** Renders WhatsApp-style *bold* and bare URLs safely (no HTML injection). */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*[^*]+\*$/.test(p)) return <strong key={i} className="font-semibold">{p.slice(1, -1)}</strong>;
        if (/^https?:\/\//.test(p))
          return (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              ver mapa
            </a>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
