import { NextResponse, type NextRequest } from "next/server";
import { listBusinesses } from "@/lib/accounts";
import { sendDueReminders, sendSurveys } from "@/lib/reminders";
import { sendMonthlyReport } from "@/lib/report";
import { sendRecalls } from "@/lib/recalls";
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
      results[b.id] = await withBusiness(b.id, async () => ({ reminders: await sendDueReminders(), surveys: await sendSurveys(), recalls: await sendRecalls(), report: await sendMonthlyReport() }));
    } catch (err) {
      results[b.id] = { error: (err as Error).message };
    }
  }
  return NextResponse.json({ businesses: businesses.length, results });
}
