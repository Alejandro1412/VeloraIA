"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AccountError, authenticate, registerWithPassword } from "@/lib/accounts";
import { createDemoSession, createSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; fields?: Record<string, string> } | null;

const Login = z.object({
  email: z.email("Escribe un correo válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 10, 10 * 60_000)) {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }
  const email = String(form.get("email") ?? "");
  const parsed = Login.safeParse({ email, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields: { email } };

  try {
    const user = await authenticate(parsed.data.email, parsed.data.password);
    await createSession({ userId: user.id, businessId: user.businessId, name: user.name, email: user.email });
  } catch (err) {
    if (err instanceof AccountError) return { error: err.message, fields: { email } };
    throw err;
  }
  redirect("/app");
}

const Register = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  businessName: z.string().trim().min(2, "Escribe el nombre de tu negocio").max(80),
  vertical: z.string().trim().max(60).optional(),
  email: z.email("Escribe un correo válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(200)
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "La contraseña debe tener letras y números"),
  terms: z.literal("on", { error: "Debes aceptar la política de tratamiento de datos" }),
});

export async function registerAction(_: AuthState, form: FormData): Promise<AuthState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`register:${ip}`, 5, 60 * 60_000)) {
    return { error: "Se crearon demasiadas cuentas desde esta conexión. Inténtalo más tarde." };
  }
  const raw = Object.fromEntries(form) as Record<string, string>;
  const fields = {
    name: raw.name ?? "",
    businessName: raw.businessName ?? "",
    vertical: raw.vertical ?? "",
    email: raw.email ?? "",
    terms: raw.terms ?? "",
  };
  const parsed = Register.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };

  try {
    const user = await registerWithPassword(parsed.data);
    await createSession({ userId: user.id, businessId: user.businessId, name: user.name, email: user.email });
  } catch (err) {
    if (err instanceof AccountError) return { error: err.message, fields };
    throw err;
  }
  redirect("/app/ajustes?bienvenida=1");
}

export async function demoAction() {
  await createDemoSession();
  redirect("/app");
}
