import { db } from "~/db.server";

export async function createPushSubscription({ userId, endpoint, p256dh, auth }: { userId: string; endpoint: string; p256dh: string; auth: string }) {
  return db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth, createdAt: new Date() },
    create: { userId, endpoint, p256dh, auth },
  });
}

export async function deletePushSubscription(endpoint: string) {
  return db.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function getPushSubscriptionsForUser(userId: string) {
  return db.pushSubscription.findMany({ where: { userId } });
}

export async function getAllPushSubscriptions() {
  return db.pushSubscription.findMany();
}
