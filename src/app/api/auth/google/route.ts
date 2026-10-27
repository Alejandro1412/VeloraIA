import { NextResponse, type NextRequest } from "next/server";
import { buildAuthRequest, googleConfigured } from "@/lib/google";
import { canonicalOrigin } from "@/lib/site";

const COOKIE = "velora_google_oauth";

/** Starts "Continue with Google": stores state/nonce/PKCE verifier, redirects to Google. */
export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url));
  }
  // Start (and finish) on the domain registered in Google, so the state cookie
  // and the session cookie live on the same host as the callback.
  const canonical = canonicalOrigin();
  if (canonical && canonical !== req.nextUrl.origin) {
    return NextResponse.redirect(`${canonical}/api/auth/google${req.nextUrl.search}`);
  }
  const { url, state, nonce, verifier } = buildAuthRequest(req.nextUrl.origin);
  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE, JSON.stringify({ state, nonce, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  // Team invite links send people here with ?invite=<token>.
  const invite = req.nextUrl.searchParams.get("invite");
  if (invite && /^[A-Za-z0-9_-]{20,40}$/.test(invite)) {
    res.cookies.set("velora_invite", invite, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
  }
  return res;
}
