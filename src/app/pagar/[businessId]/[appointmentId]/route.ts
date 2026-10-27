import { NextResponse, type NextRequest } from "next/server";
import { getAppointment, getCustomer, getSettings } from "@/lib/data/store";
import { isValidBusinessId, withBusiness } from "@/lib/tenant";
import { businessWompi, checkoutUrl } from "@/lib/wompi";
import { siteUrl } from "@/lib/site";

/**
 * Short, shareable deposit link sent in chat. Signs a fresh Wompi checkout for
 * the appointment's pending deposit and redirects there.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/pagar/[businessId]/[appointmentId]">) {
  const { businessId, appointmentId } = await ctx.params;
  if (!isValidBusinessId(businessId)) return new NextResponse("Not found", { status: 404 });
  const back = `${siteUrl()}/reservar/${businessId}`;

  return withBusiness(businessId, async () => {
    const [apt, settings] = await Promise.all([getAppointment(appointmentId), getSettings()]);
    const keys = businessWompi(settings);
    if (!apt || !apt.deposit || !keys) return NextResponse.redirect(back);
    if (apt.deposit.status !== "pending" || apt.status === "cancelled") {
      return NextResponse.redirect(`${back}?pago=${apt.deposit.status === "paid" ? "listo" : "no-disponible"}`);
    }
    const customer = await getCustomer(apt.customerId);
    const url = checkoutUrl(keys, {
      reference: apt.deposit.reference,
      amount: apt.deposit.amount,
      redirectUrl: `${back}?pago=enviado`,
      email: customer?.phone?.includes("@") ? customer.phone : undefined,
    });
    return NextResponse.redirect(url);
  });
}
