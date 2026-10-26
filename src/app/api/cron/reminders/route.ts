import { NextResponse, type NextRequest } from "next/server";
import { listBusinesses } from "@/lib/accounts";
import { sendDueReminders } from "@/lib/reminders";
import { withBusiness } from "@/lib/tenant";

/** Called by Vercel Cron (see vercel.json). Protected by CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businesses = await listBusinesses();
  const results: Record<string, unknown> = {};
  for (const b of businesses) {
    try {
      results[b.id] = await withBusiness(b.id, () => sendDueReminders());
    } catch (err) {
      results[b.id] = { error: (err as Error).message };
    }
  }
  return NextResponse.json({ businesses: businesses.length, results });
}
