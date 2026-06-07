// Studio service worker — caches the app shell so it opens fast and works
// offline (the localStorage gallery is available offline; new generations need
// the network). Scoped to /studio.
const CACHE = "studio-shell-v1";
const SHELL = ["/studio", "/studio-icon.svg", "/studio-manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache the generation API or cross-origin media (Pollinations/Replicate).
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/studio", copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match("/studio").then((r) => r || caches.match(req))),
    );
    return;
  }

  // Same-origin assets: cache-first, then network.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
            }
            return res;
          })
          .catch(() => cached),
    ),
  );
});
