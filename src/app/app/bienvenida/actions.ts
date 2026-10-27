"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { PLANS } from "@/lib/billing";
import { getBusiness } from "@/lib/accounts";
import { subscriptionFor } from "@/lib/billing";
import { getService, getSettings, listStaff, saveService, saveSettings, saveStaff } from "@/lib/data/store";
import type { DayHours } from "@/lib/domain/types";

type Result = { ok?: boolean; error?: string };
const time = z.string().regex(/^\d{2}:\d{2}$/);

const Business = z.object({
  phone: z.string().trim().max(30).default(""),
  address: z.string().trim().max(160).default(""),
  assistantName: z.string().trim().min(2, "Ponle un nombre a tu recepcionista").max(30),
});

export async function saveBusinessStep(input: z.input<typeof Business>): Promise<Result> {
  const session = await requireOwner();
  if (session.demo) return { ok: true };
  const p = Business.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message };
  const s = await getSettings();
  const welcome = s.welcomeMessage.includes(s.assistantName) ? s.welcomeMessage.replaceAll(s.assistantName, p.data.assistantName) : s.welcomeMessage;
  await saveSettings({ ...s, ...p.data, welcomeMessage: welcome });
  return { ok: true };
}

const Hours = z.array(z.object({ open: time, close: time, lunch: z.boolean() }).nullable()).length(7);

export async function saveHoursStep(input: z.input<typeof Hours>): Promise<Result> {
  const session = await requireOwner();
  if (session.demo) return { ok: true };
  const p = Hours.safeParse(input);
  if (!p.success) return { error: "Revisa los horarios." };
  if (p.data.every((d) => !d)) return { error: "Abre al menos un día." };
  for (const d of p.data) if (d && d.open >= d.close) return { error: "La hora de cierre debe ser después de la de apertura." };
  const hours: (DayHours | null)[] = p.data.map((d) =>
    d ? { open: d.open, close: d.close, breaks: d.lunch && d.open < "12:30" && d.close > "14:00" ? [{ start: "12:30", end: "14:00" }] : [] } : null,
  );
  const s = await getSettings();
  await saveSettings({ ...s, hours });
  return { ok: true };
}

const Services = z.array(
  z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2).max(80),
    durationMinutes: z.coerce.number().int().min(5).max(600),
    price: z.coerce.number().min(0),
    active: z.boolean(),
  }),
);

export async function saveServicesStep(input: z.input<typeof Services>): Promise<Result> {
  const session = await requireOwner();
  if (session.demo) return { ok: true };
  const p = Services.safeParse(input);
  if (!p.success) return { error: "Revisa nombre, duración y precio de cada servicio." };
  if (!p.data.some((s) => s.active)) return { error: "Deja al menos un servicio activo." };
  for (const s of p.data) {
    const existing = s.id ? await getService(s.id) : null;
    await saveService({
      ...(existing ?? { description: "", keywords: s.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3) }),
      id: existing?.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: s.price,
      active: s.active,
    });
  }
  return { ok: true };
}

export async function saveTeamStep(names: string[]): Promise<Result> {
  const session = await requireOwner();
  if (session.demo) return { ok: true };
  const clean = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2 && n.length <= 40))];
  const existing = await listStaff();
  const business = await getBusiness(session.businessId);
  const limit = business ? subscriptionFor(business).limits.staffLimit : PLANS.profesional.staffLimit;
  const toAdd = clean.filter((n) => !existing.some((e) => e.name.toLowerCase() === n.toLowerCase()));
  if (existing.length + toAdd.length > limit) return { error: `Tu plan permite hasta ${limit} profesionales.` };
  for (const name of toAdd) await saveStaff({ name, serviceIds: [], daysOff: [], active: true });
  revalidatePath("/app", "layout");
  return { ok: true };
}
