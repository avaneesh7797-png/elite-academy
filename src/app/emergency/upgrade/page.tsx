"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CheckCircle2, Crown, ExternalLink, Loader2 } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";
import { useTwaMode } from "@/lib/emergency/use-twa";
import {
  IS_LIFETIME,
  PAYU_PAYMENT_AMOUNT,
  PAYU_PAYMENT_LABEL,
  PAYU_PAYMENT_LINK,
} from "@/lib/emergency/payu-link";

function statusBanner(s: string | null) {
  if (!s) return null;
  if (s === "submitted")
    return {
      color: "bg-amber-600/20 text-amber-300 border-amber-700",
      text: "Payment submitted. We'll activate your subscription once verified.",
    };
  if (s === "success")
    return {
      color: "bg-emerald-600/20 text-emerald-300 border-emerald-700",
      text: "Payment received. Premium is active.",
    };
  if (s === "failure" || s === "failed")
    return {
      color: "bg-red-600/20 text-red-300 border-red-700",
      text: "Payment failed. You weren't charged.",
    };
  return null;
}

function UpgradeInner() {
  const params = useSearchParams();
  const initialBanner = statusBanner(params.get("status"));
  const { status, loading, refresh } = useEmergencyStatus();
  const { isTwa } = useTwaMode();
  const [banner, setBanner] = useState(initialBanner);
  const [showConfirm, setShowConfirm] = useState(false);
  const [txnid, setTxnid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (params.get("status") === "success") refresh();
  }, [params, refresh]);

  const goToPayU = () => {
    if (!status.user) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent("/emergency/upgrade")}`;
      return;
    }
    setShowConfirm(true);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      window.location.href = PAYU_PAYMENT_LINK;
    } else {
      const w = window.open(PAYU_PAYMENT_LINK, "_blank", "noopener");
      if (!w) window.location.href = PAYU_PAYMENT_LINK;
    }
  };

  const confirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!txnid.trim()) {
      setError("Enter the PayU Transaction ID from your confirmation page or email.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/emergency/billing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnid: txnid.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Could not record payment.");
      } else {
        setSubmitted(true);
        setBanner({
          color: "bg-amber-600/20 text-amber-300 border-amber-700",
          text: "Payment submitted. We'll activate your subscription once verified.",
        });
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const expiry = status.currentPeriodEnd ? new Date(status.currentPeriodEnd) : null;

  return (
    <>
      <BackBar title="Premium" />
      <div className="px-4 py-5 space-y-5">
        {banner && (
          <div className={`rounded-xl border px-3 py-2 text-sm ${banner.color}`}>{banner.text}</div>
        )}

        <div className="rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-900/30 to-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Emergency Premium</div>
              <div className="text-xs text-zinc-400">SOS, Medical ID, first aid &mdash; always free.</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <Feature>Cloud sync &mdash; Medical ID and contacts on every device</Feature>
            <Feature>Nearby help &mdash; hospitals, clinics, pharmacies, AEDs</Feature>
            <Feature>Family circle &mdash; share location and broadcast SOS</Feature>
            <Feature>Priority offline cache updates</Feature>
          </ul>
        </div>

        {isTwa && !status.isPremium ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
            <div className="font-semibold">Manage Premium on the web</div>
            <p className="mt-1 text-xs text-zinc-400">
              Premium is available only through the website. Sign in here with the same email
              after you&apos;ve upgraded on the web and your access will apply automatically.
            </p>
          </div>
        ) : status.isPremium ? (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-4">
            <div className="font-semibold text-emerald-300">You&apos;re on Premium</div>
            <div className="mt-1 text-xs text-zinc-300">
              {status.plan ? `Plan: ${status.plan}.` : null}{" "}
              {IS_LIFETIME
                ? "Lifetime access."
                : expiry
                  ? `Valid until ${expiry.toLocaleDateString()}.`
                  : null}
            </div>
            <Link
              href="/emergency"
              className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-semibold">{PAYU_PAYMENT_LABEL}</div>
                  <div className="text-xs text-zinc-400">
                    One-time payment &middot; no renewals
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">₹{PAYU_PAYMENT_AMOUNT}</div>
                </div>
              </div>
            </div>

            {!showConfirm ? (
              <button
                onClick={goToPayU}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 font-semibold text-zinc-950 active:bg-amber-400"
              >
                <ExternalLink className="h-4 w-4" />
                Pay ₹{PAYU_PAYMENT_AMOUNT} with PayU
              </button>
            ) : submitted ? (
              <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Transaction recorded
                </div>
                <p className="mt-2 text-xs text-zinc-300">
                  Your Premium will activate once the merchant verifies the payment.
                  You can close this page; your status will refresh automatically.
                </p>
                <button
                  onClick={() => refresh()}
                  className="mt-3 rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-200"
                >
                  Refresh status
                </button>
              </div>
            ) : (
              <form onSubmit={confirmPayment} className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                <div>
                  <div className="text-sm font-semibold">Step 2 &mdash; confirm payment</div>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Once PayU has charged you, paste the Transaction ID shown on the confirmation page or
                    in PayU&apos;s email.
                  </p>
                </div>
                <input
                  value={txnid}
                  onChange={(e) => setTxnid(e.target.value)}
                  placeholder="PayU Transaction ID"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "I've paid"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="rounded-lg bg-zinc-800 px-3 text-xs text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  type="button"
                  onClick={goToPayU}
                  className="block w-full text-center text-xs text-amber-300 underline"
                >
                  Re-open PayU payment page
                </button>
              </form>
            )}

            {!status.user && !loading && (
              <p className="text-center text-xs text-zinc-400">You&apos;ll be asked to sign in first.</p>
            )}

            <p className="text-center text-[11px] leading-relaxed text-zinc-500">
              Payments are processed by PayU. One-time charge &mdash; nothing renews.
              Premium activates after the merchant confirms the transaction (usually within a few hours).
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-zinc-200">
      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-zinc-400">Loading…</div>}>
      <UpgradeInner />
    </Suspense>
  );
}
