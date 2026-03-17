import { useEffect, useState } from "react";

const STORAGE_KEY = "car-tracker-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // Start as dismissed to avoid flash

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setDeferredPrompt(null);
      setDismissed(true);
      // If accepted, don't show again (browser removes the event anyway)
      // If dismissed by user, persist so we don't nag
      localStorage.setItem(STORAGE_KEY, "1");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <div className="alert alert-info" style={{ justifyContent: "space-between" }}>
      <span>📲 Install Car Work Tracker as an app for a better experience!</span>
      <div className="flex gap-sm">
        <button className="btn btn-primary btn-sm" onClick={handleInstall}>
          Install
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleDismiss}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
