/**
 * Canonical production address. Google sign-in only accepts redirect URIs
 * registered in Google Cloud, so every sign-in goes through this host even
 * when people open another alias of the same deployment.
 */
const PRODUCTION_ORIGIN = "https://velora-alejandro-polanco-andrades-projects.vercel.app";

export function canonicalOrigin(): string | null {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return process.env.VERCEL_ENV === "production" ? PRODUCTION_ORIGIN : null;
}

/** Public base URL of the deployment, for links in emails, WhatsApp and calendars. */
export function siteUrl(): string {
  const canonical = canonicalOrigin();
  if (canonical) return canonical;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
