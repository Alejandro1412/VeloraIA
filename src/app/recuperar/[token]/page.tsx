import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

export default function ResetPage({ params }: PageProps<"/recuperar/[token]">) {
  return (
    <AuthShell
      aside={<p className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">Casi listo. Elige una contraseña que no uses en otro sitio.</p>}
    >
      <h1 className="font-display text-4xl font-semibold tracking-[-0.035em]">Crea una nueva contraseña</h1>
      <Suspense>
        <Token params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function Token({ params }: { params: PageProps<"/recuperar/[token]">["params"] }) {
  const { token } = await params;
  return <ResetForm token={token} />;
}
