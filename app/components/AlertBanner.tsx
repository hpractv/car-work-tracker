import { useState } from "react";

interface AlertBannerProps {
  message: string;
  severity?: "warning" | "error" | "info";
  onDismiss?: () => void;
}

export default function AlertBanner({
  message,
  severity = "warning",
  onDismiss,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const icons = { warning: "⚠️", error: "🚨", info: "ℹ️" };

  return (
    <div className={`alert alert-${severity}`} role="alert">
      <span>{icons[severity]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => { setDismissed(true); onDismiss?.(); }}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
