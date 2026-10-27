import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { listClosures, listServices, listStaff } from "@/lib/data/store";
import { PageHeader, PageSkeleton } from "@/components/app/ui";
import { StaffEditor } from "@/components/app/StaffEditor";
import { ClosuresEditor } from "@/components/app/ClosuresEditor";

export default function StaffPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}

async function StaffContent() {
  await requireOwner();
  const [staff, services, closures] = await Promise.all([listStaff(), listServices(), listClosures()]);
  return (
    <>
      <PageHeader
        title="Profesionales"
        description="Quién atiende y qué servicios hace cada uno. Sofía asigna a alguien libre, o a quien el cliente pida por su nombre."
      />
      <div className="grid gap-12 px-5 py-6 lg:px-10 2xl:grid-cols-[1.2fr_1fr]">
        <StaffEditor staff={staff} services={services.map((s) => ({ id: s.id, name: s.name }))} />
        <ClosuresEditor closures={closures} staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
      </div>
    </>
  );
}
