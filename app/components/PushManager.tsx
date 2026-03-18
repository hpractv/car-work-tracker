import React, { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushManager({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<string>("unknown");
  const [supported, setSupported] = useState<boolean>(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window);
    (async () => {
      if (!("serviceWorker" in navigator)) return setStatus("unsupported");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "subscribed" : "not_subscribed");
      } catch (e) {
        setStatus("error");
      }
    })();
  }, []);

  async function enablePush() {
    if (!vapidPublicKey) return setStatus("no_vapid");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus("permission_denied");
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setStatus("subscribed");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
      setStatus("subscribed");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  async function disablePush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      }
      setStatus("not_subscribed");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  async function sendTest() {
    try {
      const res = await fetch("/api/push/send-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Maintenance Reminder", message: "This is a test push notification from Car Work Tracker." }) });
      const json = await res.json();
      if (json.ok) setStatus("test_sent"); else setStatus("test_failed");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  return (
    <div className="card" style={{ marginTop: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>Push Notifications</h2>
      <p className="text-muted">Enable push notifications for maintenance reminders (requires VAPID keys configured on the server).</p>
      {!supported && <p className="text-muted">Push notifications are not supported in this browser.</p>}
      {supported && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={enablePush} disabled={!vapidPublicKey || status === "subscribed"}>
            Enable Push
          </button>
          <button type="button" className="btn btn-secondary" onClick={disablePush} disabled={status !== "subscribed"}>
            Disable Push
          </button>
          <button type="button" className="btn btn-secondary" onClick={sendTest} disabled={status !== "subscribed"}>
            Send Test
          </button>
        </div>
      )}
      <p className="text-muted" style={{ marginTop: "0.5rem" }}>Status: {status}{!vapidPublicKey ? " (VAPID key missing)" : ""}</p>
    </div>
  );
}
