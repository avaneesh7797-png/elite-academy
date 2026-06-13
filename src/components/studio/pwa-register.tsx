"use client";

import { useEffect } from "react";

// We no longer use a service worker (it was caching stale app code on mobile).
// On load, proactively unregister any previously-installed Studio service
// worker and clear its caches so every visit serves fresh code from the network.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister().catch(() => undefined)))
      .catch(() => undefined);
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => caches.delete(k).catch(() => undefined)))
        .catch(() => undefined);
    }
  }, []);
  return null;
}
