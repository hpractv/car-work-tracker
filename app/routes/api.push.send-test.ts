import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { getPushSubscriptionsForUser } from "~/models/push.server";
import { sendPushNotification } from "~/utils/webpush.server";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const body = await request.json();
  const title = body.title ?? "Test Notification";
  const message = body.message ?? "This is a test push from Car Work Tracker";
  const payload = JSON.stringify({ title, message });
  const subs = await getPushSubscriptionsForUser(userId);
  const results = [] as any[];
  for (const s of subs) {
    const subscription = {
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    };
    // sendPushNotification will return an object
    // tslint:disable-next-line: no-await-in-loop
    const res = await sendPushNotification(subscription, payload);
    results.push({ endpoint: s.endpoint, result: res });
  }
  return json({ ok: true, results });
}
