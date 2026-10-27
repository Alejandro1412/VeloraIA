import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, googleConfigured } from "@/lib/google";
import { getUserByEmail, getValidInvite, joinWithGoogle, signInWithGoogle } from "@/lib/accounts";
import { createSession } from "@/lib/auth";

const COOKIE = "velora_google_oauth";

export async function GET(req: NextRequest) {
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
    res.cookies.delete({ name: COOKIE, path: "/api/auth/google" });
    return res;
  };

  if (!googleConfigured()) return fail("google_unavailable");
  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("google_cancelled");

  let saved: { state: string; nonce: string; verifier: string };
  try {
    saved = JSON.parse(req.cookies.get(COOKIE)?.value ?? "");
  } catch {
    return fail("google_expired");
  }
  const code = params.get("code");
  if (!code || params.get("state") !== saved.state) return fail("google_expired");

  try {
    const profile = await exchangeCode({ code, verifier: saved.verifier, nonce: saved.nonce, origin: req.nextUrl.origin });
    // Joining a team through an invite link (only for people without an account).
    const inviteToken = req.cookies.get("velora_invite")?.value;
    const invite = inviteToken ? await getValidInvite(inviteToken) : null;
    let destination = "/app";
    let user;
    if (invite && !(await getUserByEmail(profile.email))) {
      user = await joinWithGoogle(invite, profile);
    } else {
      const result = await signInWithGoogle(profile);
      user = result.user;
      if (result.isNew) destination = "/app/ajustes?bienvenida=1";
    }
    await createSession({ userId: user.id, businessId: user.businessId, name: user.name, email: user.email, role: user.role });
    const res = NextResponse.redirect(new URL(destination, req.url));
    res.cookies.delete({ name: COOKIE, path: "/api/auth/google" });
    res.cookies.delete("velora_invite");
    return res;
  } catch (err) {
    console.error("[velora] Google sign-in failed", err);
    return fail("google_failed");
  }
}
