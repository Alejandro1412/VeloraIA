import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getSettings, listServices, listStaff } from "@/lib/data/store";
import { siteUrl } from "@/lib/site";
import { PageSkeleton } from "@/components/app/ui";
import { Onboarding } from "@/components/app/Onboarding";

export default function WelcomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const session = await requireSession();
  if (session.role !== "owner") redirect("/app");
  const [settings, services, staff] = await Promise.all([getSettings(), listServices(), listStaff()]);
  return (
    <Onboarding
      firstName={session.name.split(" ")[0] || ""}
      business={settings.name}
      settings={{ phone: settings.phone, address: settings.address, assistantName: settings.assistantName }}
      hours={settings.hours.map((h) => (h ? { open: h.open, close: h.close, lunch: h.breaks.length > 0 } : null))}
      services={services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, price: s.price, active: s.active }))}
      staff={staff.map((s) => s.name)}
      link={`${siteUrl()}/reservar/${session.businessId}`}
    />
  );
}
