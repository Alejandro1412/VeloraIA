import "server-only";
import { createHash } from "node:crypto";

/**
 * Signing key: AUTH_SECRET when set. Otherwise it is derived from the database
 * URL (already a server-only secret), so sessions survive redeploys without
 * extra configuration. Last resort: a per-deployment key.
 */
let cachedKey: Uint8Array | null = null;
export function authSecret() {
  if (cachedKey) return cachedKey;
  const explicit = process.env.AUTH_SECRET;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const material = explicit
    ? explicit
    : createHash("sha256")
        .update(`velora-session-v1:${dbUrl ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local-dev"}`)
        .digest("base64");
  cachedKey = new TextEncoder().encode(material);
  return cachedKey;
}
