import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { listInvites, listTeam } from "@/lib/accounts";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { TeamManager } from "@/components/app/TeamManager";

const HELP = {
  "id": "equipo",
  "steps": [
    {
      "title": "Invita con un enlace",
      "body": "Sirve una sola vez y vence en 7 días."
    },
    {
      "title": "Rol Equipo",
      "body": "Ve agenda y conversaciones, pero no ajustes ni pagos."
    },
    {
      "title": "Con Google o correo",
      "body": "Quien recibe el enlace crea su acceso como prefiera."
    },
    {
      "title": "Quita accesos",
      "body": "Cuando alguien ya no trabaje contigo."
    }
  ]
};

export default function TeamPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Team />
    </Suspense>
  );
}

async function Team() {
  const session = await requireOwner();
  const [members, invites] = session.demo ? [[], []] : await Promise.all([listTeam(session.businessId), listInvites(session.businessId)]);
  return (
    <>
      <PageHeader help={HELP}
        title="Equipo"
        description="Personas que entran al panel. Tu recepcionista o tus profesionales ven la agenda y las conversaciones; los ajustes y pagos son solo tuyos."
      />
      <TeamManager
        demo={session.demo}
        me={session.email}
        members={members.map((m) => ({ email: m.email, name: m.name, role: m.role ?? "owner", google: !!m.googleSub, lastLoginAt: m.lastLoginAt }))}
        invites={invites.map((i) => ({ token: i.token, expiresAt: i.expiresAt }))}
      />
    </>
  );
}
