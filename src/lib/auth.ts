import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { DEMO_BUSINESS_ID } from "./tenant";

/**
 * Sessions: a signed, httpOnly JWT cookie that says who is signed in and which
 * business they manage. Accounts themselves live in ./accounts.ts.
 */

const COOKIE = "velora_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export interface Session {
  userId: string;
  businessId: string;
  name: string;
  email: string;
  demo: boolean;
  role: "owner" | "staff";
}

export { authSecret } from "./secret";
import { authSecret } from "./secret";

export async function createSession(s: Omit<Session, "demo" | "role"> & { demo?: boolean; role?: Session["role"] }) {
  const token = await new SignJWT({ biz: s.businessId, name: s.name, email: s.email, demo: !!s.demo, role: s.role ?? "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(authSecret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function createDemoSession() {
  await createSession({ userId: "demo", businessId: DEMO_BUSINESS_ID, name: "Visitante", email: "", demo: true });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.biz !== "string") return null;
    return {
      userId: payload.sub,
      businessId: payload.biz,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      demo: payload.demo === true,
      role: payload.role === "staff" ? "staff" : "owner",
    };
  } catch {
    return null;
  }
}

/** Use at the top of every protected server component and action. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For settings, team and billing: owners only. */
export async function requireOwner(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "owner") redirect("/app?permiso=1");
  return session;
}
