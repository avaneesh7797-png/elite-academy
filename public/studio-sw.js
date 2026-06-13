// Service worker KILL-SWITCH.
//
// The earlier caching service worker was serving a stale app shell on mobile
// (old JS kept running after deploys). A generation app needs the network
// anyway, so we remove the SW entirely: this version caches nothing, clears all
// old caches, and unregisters itself. Browsers revalidate the SW script on
// navigation, so this runs automatically on the next visit and self-destructs.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
    })(),
  );
});

// No fetch handler — every request goes straight to the network (always fresh).
