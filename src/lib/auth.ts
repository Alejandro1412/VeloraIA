import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";

/**
 * Single-tenant owner authentication: one password (ADMIN_PASSWORD) and a
 * signed, httpOnly session cookie. Swap for an identity provider when you go
 * multi-tenant.
 */

const COOKIE = "velora_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export const DEMO_PASSWORD = "velora2026";
export const isDemoAuth = () => !process.env.ADMIN_PASSWORD;

function secret() {
  const raw = process.env.AUTH_SECRET || `velora-dev-secret:${process.env.ADMIN_PASSWORD ?? DEMO_PASSWORD}`;
  return new TextEncoder().encode(raw);
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD || DEMO_PASSWORD;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function createSession() {
  const token = await new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/** Use at the top of every protected server component and action. */
export async function requireSession() {
  if (!(await hasSession())) redirect("/login");
}
