// Client-only service worker registration using virtual:pwa-register
// This file is imported from entry.client.tsx so it only runs in the browser.
import { registerSW } from 'virtual:pwa-register';

// Register the service worker with basic lifecycle callbacks for visibility in dev
const updateSW = registerSW({
  onNeedRefresh() {
    // eslint-disable-next-line no-console
    console.log('SW update available');
  },
  onOfflineReady() {
    // eslint-disable-next-line no-console
    console.log('Offline ready');
  },
});

export default updateSW;
