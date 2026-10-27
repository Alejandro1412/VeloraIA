"use client";

import { useTransition } from "react";
import { switchBusinessAction } from "@/app/app/actions";

export function SwitchButton({ businessId }: { businessId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => switchBusinessAction(businessId))} className="btn-ghost btn-sm">
      {pending ? "Abriendo…" : "Abrir esta sede"}
    </button>
  );
}
