import { NextResponse, type NextRequest } from "next/server";
import { buildAuthRequest, googleConfigured } from "@/lib/google";

const COOKIE = "velora_google_oauth";

/** Starts "Continue with Google": stores state/nonce/PKCE verifier, redirects to Google. */
export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url));
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
  return res;
}
