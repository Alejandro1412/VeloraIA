import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Which business (tenant) the current operation belongs to.
 *
 * - Public channels (web chat, WhatsApp, voice, cron) know the business from
 *   the request and run their work inside `withBusiness()`.
 * - Dashboard pages and server actions resolve it from the signed-in session.
 */

export const DEMO_BUSINESS_ID = "demo";

const context = new AsyncLocalStorage<string>();

export function withBusiness<T>(businessId: string, fn: () => Promise<T>): Promise<T> {
  return context.run(businessId, fn);
}

export async function currentBusinessId(): Promise<string> {
  const scoped = context.getStore();
  if (scoped) return scoped;
  // Imported lazily to avoid a cycle (auth → accounts → store → tenant).
  const { getSession } = await import("./auth");
  const session = await getSession();
  if (!session) throw new Error("No hay un negocio activo para esta operación");
  return session.businessId;
}

export const isValidBusinessId = (id: string) => id === DEMO_BUSINESS_ID || /^biz_[a-z0-9]{16}$/.test(id);
