import "server-only";
import { createECDH, createHash } from "node:crypto";
import webpush from "web-push";
import { getRepo } from "./data/repo";
import { authSecret } from "./secret";
import { siteUrl } from "./site";

/**
 * Web Push for the business panel. The VAPID key pair is derived from the
 * server secret, so it is stable across deploys and needs no configuration.
 */
let keys: { publicKey: string; privateKey: string } | null = null;
export function vapidKeys() {
  if (keys) return keys;
  const priv = createHash("sha256").update(Buffer.from(authSecret())).update("velora-vapid-v1").digest();
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(priv);
  keys = { publicKey: ecdh.getPublicKey().toString("base64url"), privateKey: priv.toString("base64url") };
  return keys;
}

export interface StoredSubscription {
  businessId: string;
  userId: string;
  subscription: webpush.PushSubscription;
  createdAt: string;
}

const KIND = "push_sub";
const idFor = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

export async function saveSubscription(businessId: string, userId: string, subscription: webpush.PushSubscription) {
  if (!subscription?.endpoint?.startsWith("https://") || !subscription.keys?.p256dh || !subscription.keys?.auth) throw new Error("Suscripción inválida");
  const entry: StoredSubscription = { businessId, userId, subscription, createdAt: new Date().toISOString() };
  await getRepo().put(KIND, idFor(subscription.endpoint), entry, { ts: entry.createdAt });
}

export async function removeSubscription(endpoint: string) {
  await getRepo().remove(KIND, idFor(endpoint));
}

/** Sends a push to every device subscribed for this business. Never throws. */
export async function pushToBusiness(businessId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  try {
    const all = await getRepo().list<StoredSubscription>(KIND);
    const targets = all.filter((s) => s.businessId === businessId);
    if (!targets.length) return;
    const { publicKey, privateKey } = vapidKeys();
    webpush.setVapidDetails(siteUrl().startsWith("https://") ? siteUrl() : "mailto:soporte@velora.app", publicKey, privateKey);
    await Promise.allSettled(
      targets.map((t) =>
        webpush.sendNotification(t.subscription, JSON.stringify(payload), { TTL: 60 * 60 * 6, urgency: "high" }).catch(async (err: { statusCode?: number }) => {
          // Gone / not found: the device unsubscribed; forget it.
          if (err?.statusCode === 404 || err?.statusCode === 410) await removeSubscription(t.subscription.endpoint);
        }),
      ),
    );
  } catch (err) {
    console.error("[velora] push failed", err);
  }
}
