import { NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { getCustomer, getSettings, listAppointments, listServices, listStaff } from "@/lib/data/store";
import { withBusiness } from "@/lib/tenant";

/**
 * Read-only calendar feed (iCalendar). Owners subscribe from Google Calendar,
 * Outlook or Apple Calendar with “Add calendar from URL”.
 * URL: /api/calendar/<token>.ics   Optional ?staff=<id> for one professional.
 */

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 lines must be ≤ 75 octets; fold longer ones. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/calendar/[token]">) {
  const token = (await ctx.params).token.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const owner = await getRepo().get<{ businessId: string }>("calendar_token", token);
  if (!owner) return new NextResponse("Not found", { status: 404 });
  const staffFilter = req.nextUrl.searchParams.get("staff");

  return withBusiness(owner.businessId, async () => {
    const [settings, services, staff] = await Promise.all([getSettings(), listServices(), listStaff()]);
    const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const to = new Date(Date.now() + 120 * 86_400_000).toISOString();
    const appointments = (await listAppointments({ from, to })).filter(
      (a) => (a.status === "booked" || a.status === "confirmed") && (!staffFilter || a.staffId === staffFilter),
    );
    const now = stamp(new Date().toISOString());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//IONEX//Velora//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${esc(`Citas · ${settings.name}`)}`,
      "X-PUBLISHED-TTL:PT15M",
    ];
    for (const a of appointments) {
      const service = services.find((s) => s.id === a.serviceId);
      const customer = await getCustomer(a.customerId);
      const who = staff.find((s) => s.id === a.staffId)?.name;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${a.id}@velora`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(a.start)}`,
        `DTEND:${stamp(a.end)}`,
        `SUMMARY:${esc(`${service?.name ?? "Cita"} · ${customer?.name ?? "Cliente"}`)}`,
        `DESCRIPTION:${esc([who ? `Con: ${who}` : "", customer?.phone?.startsWith("+") ? `Tel: ${customer.phone}` : "", a.notes].filter(Boolean).join("\n"))}`,
        `STATUS:${a.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    return new NextResponse(lines.map(fold).join("\r\n"), {
      headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" },
    });
  });
}
