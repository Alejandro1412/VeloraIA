import { NextResponse, type NextRequest } from "next/server";
import { sendDueReminders } from "@/lib/reminders";

/** Called by Vercel Cron (see vercel.json). Protected by CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const run = await sendDueReminders();
  return NextResponse.json(run);
}
