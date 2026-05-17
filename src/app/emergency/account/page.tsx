"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { CheckCircle2, CloudDownload, CloudUpload, Crown, Loader2, LogOut, User as UserIcon } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";
import { IS_LIFETIME } from "@/lib/emergency/payu-link";
import {
  EMPTY_PROFILE,
  loadContacts,
  loadProfile,
  loadSettings,
  saveContacts,
  saveProfile,
  saveSettings,
} from "@/lib/emergency/storage";

type Mode = "signin" | "signup";

export default function AccountPage() {
  const { status, loading, refresh } = useEmergencyStatus();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status.user && !status.isPremium) setSyncMsg(null);
  }, [status]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const name = String(fd.get("name") || "").trim();

    try {
      if (mode === "signup") {
        const r = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Could not sign up.");
          setBusy(false);
          return;
        }
      }
      const r = await signIn("credentials", { email, password, redirect: false });
      if (!r?.ok) {
        setError("Invalid email or password.");
      } else {
        await refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const pushSync = async () => {
    setSyncMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/emergency/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: loadContacts().map((c) => ({ name: c.name, phone: c.phone, relationship: c.relationship })),
          profile: loadProfile(),
          settings: loadSettings(),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSyncMsg(data.error || "Sync failed.");
      } else {
        setSyncMsg("Uploaded to cloud.");
      }
    } catch {
      setSyncMsg("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const pullSync = async () => {
    setSyncMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/emergency/sync", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) {
        setSyncMsg(data.error || "Could not load.");
        return;
      }
      if (data.profile) saveProfile({ ...EMPTY_PROFILE, ...data.profile });
      if (Array.isArray(data.contacts)) {
        saveContacts(
          data.contacts.map((c: { id: string; name: string; phone: string; relationship: string }) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            relationship: c.relationship,
          }))
        );
      }
      if (data.settings) saveSettings(data.settings);
      setSyncMsg("Cloud data restored to this device.");
    } catch {
      setSyncMsg("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const expiry = status.currentPeriodEnd ? new Date(status.currentPeriodEnd) : null;

  return (
    <>
      <BackBar title="Account" />
      <div className="px-4 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : status.user ? (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{status.user.name}</div>
                  <div className="truncate text-xs text-zinc-400">{status.user.email}</div>
                </div>
                <button
                  onClick={() => signOut({ redirect: false }).then(() => refresh())}
                  className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-900/30 to-zinc-900 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                  <Crown className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {status.isPremium ? "Premium" : "Free plan"}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-300">
                    {status.isPremium
                      ? IS_LIFETIME
                        ? "Lifetime access"
                        : expiry
                          ? `Valid until ${expiry.toLocaleDateString()}`
                          : "Active"
                      : "Unlock cloud sync, nearby help, and family circle."}
                  </div>
                  {!status.isPremium && (
                    <Link
                      href="/emergency/upgrade"
                      className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-zinc-950"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {status.isPremium && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Cloud sync</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Upload from this device, or pull cloud data to restore it here.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={pushSync}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <CloudUpload className="h-4 w-4" /> Upload
                  </button>
                  <button
                    onClick={pullSync}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 disabled:opacity-50"
                  >
                    <CloudDownload className="h-4 w-4" /> Restore
                  </button>
                </div>
                {syncMsg && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {syncMsg}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex gap-1 rounded-lg bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
                  mode === "signin" ? "bg-zinc-800 text-white" : "text-zinc-400"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
                  mode === "signup" ? "bg-zinc-800 text-white" : "text-zinc-400"
                }`}
              >
                Create account
              </button>
            </div>

            {mode === "signup" && (
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Name</span>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs text-zinc-400">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-zinc-400">Password</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>

            <p className="text-center text-[11px] text-zinc-500">
              An account is only needed for Premium (cloud sync, nearby help). All free features work without one.
            </p>
          </form>
        )}
      </div>
    </>
  );
}
