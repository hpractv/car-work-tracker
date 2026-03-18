import webPush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails("mailto:dev@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  // If keys are not present, generate a pair for development (not persisted)
  try {
    const keys = webPush.generateVAPIDKeys();
    // Only set if generation succeeded
    webPush.setVapidDetails("mailto:dev@example.com", keys.publicKey, keys.privateKey);
    console.warn("Generated ephemeral VAPID keys for development. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in production.");
    console.warn("VAPID_PUBLIC_KEY=", keys.publicKey);
  } catch (e) {
    console.warn("web-push not available or failed to generate VAPID keys", e);
  }
}

export function getPublicVapidKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function sendPushNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) {
  try {
    await webPush.sendNotification(subscription, payload);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
