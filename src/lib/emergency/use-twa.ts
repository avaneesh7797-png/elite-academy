"use client";

import { useEffect, useState } from "react";

const KEY = "emergency:twa-mode:v1";

export function useTwaMode() {
  const [isTwa, setIsTwa] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let detected = false;
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === "1") detected = true;
    } catch {}

    if (!detected) {
      if (document.referrer && document.referrer.startsWith("android-app://")) {
        detected = true;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("source") === "twa") detected = true;
    }

    if (detected) {
      try {
        window.localStorage.setItem(KEY, "1");
      } catch {}
    }

    setIsTwa(detected);
    setResolved(true);
  }, []);

  return { isTwa, resolved };
}
