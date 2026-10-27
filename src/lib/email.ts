import "server-only";

/** Transactional email through Resend's HTTP API (no SDK needed). */

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Simple branded layout: a heading, paragraphs and an optional button. */
export function emailLayout(input: { title: string; paragraphs: string[]; cta?: { label: string; url: string } }) {
  const p = input.paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#2a3657">${escapeHtml(t)}</p>`).join("");
  const cta = input.cta
    ? `<p style="margin:22px 0 0"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background:#2b4cff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;font-size:15px">${escapeHtml(input.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#edf1f6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
    <p style="margin:0 0 20px;font-weight:700;color:#0e1b3d;font-size:18px">Velora</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#0e1b3d">${escapeHtml(input.title)}</h1>${p}${cta}
  </div>
  <p style="text-align:center;color:#5b6886;font-size:12px;margin-top:16px">Velora · un producto de IONEX</p>
</body></html>`;
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Velora <onboarding@resend.dev>",
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[velora] email failed", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[velora] email failed", err);
    return false;
  }
}
