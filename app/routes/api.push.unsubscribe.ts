import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { deletePushSubscription } from "~/models/push.server";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  try {
    const data = await request.json();
    const endpoint = data.endpoint;
    if (!endpoint) return json({ error: "Invalid request" }, { status: 400 });
    await deletePushSubscription(endpoint);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
}
