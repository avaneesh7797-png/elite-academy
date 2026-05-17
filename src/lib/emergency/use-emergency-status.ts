"use client";

import { useCallback, useEffect, useState } from "react";

export type EmergencyStatus = {
  user: { id: string; name: string; email: string } | null;
  isPremium: boolean;
  currentPeriodEnd: string | null;
  plan: string | null;
  payuConfigured: boolean;
};

const DEFAULT: EmergencyStatus = {
  user: null,
  isPremium: false,
  currentPeriodEnd: null,
  plan: null,
  payuConfigured: false,
};

export function useEmergencyStatus() {
  const [status, setStatus] = useState<EmergencyStatus>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/emergency/status", { cache: "no-store" });
      if (r.ok) {
        const data = (await r.json()) as EmergencyStatus;
        setStatus(data);
      }
    } catch {
      // offline — keep last state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
