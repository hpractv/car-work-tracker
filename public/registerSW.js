// Simple service worker registration script used by root.tsx
// This file is intentionally small and safe for browsers that support service workers.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js')
      .then(function (registration) {
        console.log('Service Worker registered with scope:', registration.scope);
        // Listen for updates and log them (optional)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            console.log('Service Worker state change:', newWorker.state);
          });
        });
      })
      .catch(function (err) {
        console.warn('Service Worker registration failed:', err);
      });
  });
} else {
  console.log('Service workers not supported in this browser.');
}
