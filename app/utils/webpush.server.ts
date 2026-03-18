import webPush from "web-push";

let ephemeralPublicKey: string | null = null;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails("mailto:dev@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else if (process.env.NODE_ENV !== 'test') {
  // If keys are not present, generate a pair for development (not persisted)
  try {
    const keys = webPush.generateVAPIDKeys();
    ephemeralPublicKey = keys.publicKey;
    // Only set if generation succeeded
    webPush.setVapidDetails("mailto:dev@example.com", keys.publicKey, keys.privateKey);
    console.warn("Generated ephemeral VAPID keys for development. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in production.");
    console.warn("VAPID_PUBLIC_KEY=", keys.publicKey);
  } catch (e) {
    console.warn("web-push not available or failed to generate VAPID keys", e);
  }
} else {
  // In test environment do not generate ephemeral keys to keep deterministic behavior for unit tests
  // Leave ephemeralPublicKey as null
}

export function getPublicVapidKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? ephemeralPublicKey ?? null;
}

export async function sendPushNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) {
  try {
    await webPush.sendNotification(subscription, payload);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
