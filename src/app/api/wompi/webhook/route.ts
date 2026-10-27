import { NextResponse, type NextRequest } from "next/server";
import { activatePaidMonth, PLANS, type PlanId } from "@/lib/billing";
import { getRepo } from "@/lib/data/repo";
import { getAppointment, getSettings, saveAppointment } from "@/lib/data/store";
import { onDepositPaid } from "@/lib/events";
import { isValidBusinessId, withBusiness } from "@/lib/tenant";
import { parseReference, verifyEvent, type WompiEvent } from "@/lib/wompi";

/**
 * Wompi events.
 * - IONEX subscriptions: https://<domain>/api/wompi/webhook  (secret WOMPI_EVENTS_SECRET)
 * - Business deposits:   https://<domain>/api/wompi/webhook?b=<businessId>  (secret in that business' Ajustes)
 */
export async function POST(req: NextRequest) {
  const event = (await req.json().catch(() => null)) as WompiEvent | null;
  if (!event?.data?.transaction) return NextResponse.json({ ok: false }, { status: 400 });

  const businessId = req.nextUrl.searchParams.get("b");
  const tx = event.data.transaction;
  const ref = parseReference(tx.reference);

  if (businessId) {
    if (!isValidBusinessId(businessId)) return NextResponse.json({ ok: false }, { status: 404 });
    return withBusiness(businessId, async () => {
      const settings = await getSettings();
      if (!settings.wompiEventsSecret || !verifyEvent(event, settings.wompiEventsSecret)) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
      if (event.event !== "transaction.updated" || tx.status !== "APPROVED" || ref?.kind !== "deposit") {
        return NextResponse.json({ ok: true, ignored: true });
      }
      const apt = await getAppointment(ref.appointmentId);
      if (!apt?.deposit || apt.deposit.reference !== tx.reference || apt.deposit.status === "paid") {
        return NextResponse.json({ ok: true, ignored: true });
      }
      if (tx.amount_in_cents < Math.round(apt.deposit.amount * 100)) return NextResponse.json({ ok: false, reason: "amount" }, { status: 400 });
      const updated = await saveAppointment({
        ...apt,
        status: apt.status === "booked" ? "confirmed" : apt.status,
        deposit: { ...apt.deposit, status: "paid", paidAt: new Date().toISOString() },
      });
      await onDepositPaid(updated);
      return NextResponse.json({ ok: true });
    });
  }

  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret || !verifyEvent(event, secret)) return NextResponse.json({ ok: false }, { status: 401 });
  if (event.event !== "transaction.updated" || tx.status !== "APPROVED" || ref?.kind !== "subscription") {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const plan = PLANS[ref.plan as PlanId];
  if (!plan || tx.amount_in_cents < plan.price * 100) return NextResponse.json({ ok: false, reason: "amount" }, { status: 400 });
  // Wompi retries events: process each transaction once.
  const repo = getRepo();
  if (await repo.get("wompi_tx", tx.id)) return NextResponse.json({ ok: true, duplicate: true });
  await activatePaidMonth(ref.businessId, plan.id);
  await repo.put("wompi_tx", tx.id, { reference: tx.reference, at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
