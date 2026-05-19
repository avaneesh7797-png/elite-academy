const CACHE = "emergency-v2";

// Only static, non-personalised assets are cache-firsted. HTML pages are
// network-first so signed-in / signed-out users never see each other's render.
const STATIC_SHELL = [
  "/emergency-manifest.webmanifest",
  "/emergency-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname === "/emergency-manifest.webmanifest") return true;
  if (url.pathname === "/emergency-icon.svg") return true;
  if (url.pathname.startsWith("/emergency-icon/")) return true;
  return false;
}

function isEmergencyHtml(url) {
  if (url.pathname === "/emergency") return true;
  if (url.pathname.startsWith("/emergency/")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never touch API routes — they're user-scoped and must always go to network.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const clone = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  if (isEmergencyHtml(url)) {
    // Network-first so authenticated state is always fresh; fall back to last
    // good cached response only when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/emergency")))
    );
  }
});
