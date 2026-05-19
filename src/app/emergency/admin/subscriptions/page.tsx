"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldX, XCircle } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";

type Pending = {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  payuTxnId: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

export default function AdminSubscriptionsPage() {
  const { status, loading: statusLoading } = useEmergencyStatus();
  const [items, setItems] = useState<Pending[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/emergency/billing/admin", { cache: "no-store" });
      if (r.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await r.json();
      setItems(data.pending ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (status.user) load();
  }, [status.user, load]);

  const act = async (id: string, action: "activate" | "reject") => {
    setBusy(id);
    try {
      await fetch("/api/emergency/billing/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (statusLoading) {
    return (
      <>
        <BackBar title="Admin · Subscriptions" />
        <div className="px-4 py-10 text-center text-zinc-400">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      </>
    );
  }

  if (forbidden || !status.user) {
    return (
      <>
        <BackBar title="Admin · Subscriptions" />
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-600/20 text-red-300">
            <ShieldX className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Admin only</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-400">
            Set the <code>ADMIN_EMAIL</code> environment variable to the account you sign in with.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackBar title="Admin · Subscriptions" />
      <div className="px-4 py-5 space-y-3">
        <p className="text-xs text-zinc-400">
          Cross-check each Transaction ID against your PayU dashboard before activating.
        </p>
        {items === null ? (
          <div className="text-center text-zinc-400">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
            No pending verifications.
          </div>
        ) : (
          items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.user.name}</div>
                  <div className="truncate text-xs text-zinc-400">{s.user.email}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {s.currency} {s.amount}
                  </div>
                  <div className="text-[11px] text-zinc-500">{new Date(s.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs text-amber-300">
                {s.payuTxnId}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => act(s.id, "activate")}
                  disabled={busy === s.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Activate
                </button>
                <button
                  onClick={() => act(s.id, "reject")}
                  disabled={busy === s.id}
                  className="flex items-center justify-center gap-1 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-300 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
