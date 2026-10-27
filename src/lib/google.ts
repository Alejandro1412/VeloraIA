import "server-only";
import { canonicalOrigin } from "./site";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

/** "Sign in with Google" via OAuth 2.0 authorization code + PKCE (OpenID Connect). */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const googleConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const b64url = (buf: Buffer) => buf.toString("base64url");

export function redirectUri(origin: string) {
  return `${canonicalOrigin() ?? origin}/api/auth/google/callback`;
}

export function buildAuthRequest(origin: string) {
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, nonce, verifier };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

export async function exchangeCode(input: { code: string; verifier: string; nonce: string; origin: string }): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(input.origin),
      grant_type: "authorization_code",
      code_verifier: input.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google did not return an id_token");

  const { payload } = await jwtVerify(id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== input.nonce) throw new Error("Invalid nonce");
  if (!payload.email || payload.email_verified !== true) throw new Error("Google email is not verified");
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    name: String(payload.name ?? String(payload.email).split("@")[0]),
  };
}
