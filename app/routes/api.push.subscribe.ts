import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { createPushSubscription } from "~/models/push.server";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  try {
    const data = await request.json();
    const endpoint = data.endpoint;
    const keys = data.keys ?? {};
    const p256dh = keys.p256dh;
    const auth = keys.auth;
    if (!endpoint || !p256dh || !auth) return json({ error: "Invalid subscription" }, { status: 400 });
    await createPushSubscription({ userId, endpoint, p256dh, auth });
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
}
