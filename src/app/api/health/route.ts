import { NextResponse } from "next/server";
import { connection } from "next/server";
import { integrationStatus } from "@/lib/integrations";

export async function GET() {
  await connection();
  return NextResponse.json({
    ok: true,
    service: "velora",
    integrations: Object.fromEntries(integrationStatus().map((i) => [i.key, i.connected])),
    // Setup checklist (booleans only, never values) to help configure each channel.
    setup: {
      whatsapp: {
        token: !!process.env.WHATSAPP_TOKEN,
        phoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        verifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
        appSecret: !!process.env.WHATSAPP_APP_SECRET,
        reminderTemplate: !!process.env.WHATSAPP_REMINDER_TEMPLATE,
        surveyTemplate: !!process.env.WHATSAPP_SURVEY_TEMPLATE,
        campaignTemplate: !!process.env.WHATSAPP_CAMPAIGN_TEMPLATE,
      },
      email: { apiKey: !!process.env.RESEND_API_KEY, from: !!process.env.EMAIL_FROM },
      cron: !!process.env.CRON_SECRET,
    },
  });
}
