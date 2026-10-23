import { NextResponse } from "next/server";
import { connection } from "next/server";
import { integrationStatus } from "@/lib/integrations";

export async function GET() {
  await connection();
  return NextResponse.json({
    ok: true,
    service: "velora",
    integrations: Object.fromEntries(integrationStatus().map((i) => [i.key, i.connected])),
  });
}
