import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, Divider, GoogleButton } from "@/components/auth/AuthShell";
import { getBusiness, getValidInvite } from "@/lib/accounts";
import { googleConfigured } from "@/lib/google";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "Unirme al equipo", robots: { index: false } };

export default function InvitePage({ params }: PageProps<"/invitacion/[token]">) {
  return (
    <AuthShell aside={<p className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">Agenda y conversaciones de tu equipo, en un solo lugar.</p>}>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-line-soft" />}>
        <Invite params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function Invite({ params }: { params: PageProps<"/invitacion/[token]">["params"] }) {
  const { token } = await params;
  const invite = await getValidInvite(token);
  if (!invite) {
    return (
      <>
        <h1 className="font-display text-4xl font-semibold tracking-[-0.035em]">Esta invitación ya no es válida</h1>
        <p className="mt-3 text-ink-2">Las invitaciones vencen a los 7 días y sirven una sola vez. Pídele una nueva a quien te invitó.</p>
        <Link href="/login" className="btn-ghost mt-8">
          Ir a iniciar sesión
        </Link>
      </>
    );
  }
  const business = await getBusiness(invite.businessId);
  return (
    <>
      <h1 className="font-display text-4xl font-semibold tracking-[-0.035em]">Únete a {business?.name ?? "tu equipo"}</h1>
      <p className="mt-3 text-ink-2">Podrás ver y manejar la agenda y las conversaciones del negocio.</p>
      <div className="mt-8">
        <GoogleButton enabled={googleConfigured()} label="Unirme con Google" href={`/api/auth/google?invite=${token}`} />
      </div>
      <Divider>o con tu correo</Divider>
      <JoinForm token={token} />
    </>
  );
}
