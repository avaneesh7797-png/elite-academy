"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Crown, Loader2 } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";

type Plan = "monthly" | "yearly";

function statusBanner(status: string | null) {
  if (!status) return null;
  if (status === "success")
    return { color: "bg-emerald-600/20 text-emerald-300 border-emerald-700", text: "Payment received. Premium is active." };
  if (status === "failure" || status === "failed")
    return { color: "bg-red-600/20 text-red-300 border-red-700", text: "Payment failed. You weren't charged." };
  if (status === "cancelled")
    return { color: "bg-zinc-700/40 text-zinc-300 border-zinc-700", text: "Payment cancelled." };
  if (status === "invalid")
    return { color: "bg-red-600/20 text-red-300 border-red-700", text: "Payment response could not be verified." };
  if (status === "misconfigured")
    return { color: "bg-amber-600/20 text-amber-300 border-amber-700", text: "Payments aren't configured on this deployment yet." };
  return null;
}

function UpgradeInner() {
  const params = useSearchParams();
  const banner = statusBanner(params.get("status"));
  const { status, loading, refresh } = useEmergencyStatus();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [postFields, setPostFields] = useState<Record<string, string> | null>(null);
  const [postAction, setPostAction] = useState<string>("");

  useEffect(() => {
    if (params.get("status") === "success") refresh();
  }, [params, refresh]);

  useEffect(() => {
    if (postFields && formRef.current) {
      formRef.current.submit();
    }
  }, [postFields]);

  const startCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!status.user) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent("/emergency/upgrade")}`;
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number for the payment receipt.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/emergency/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, phone: phone.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Checkout failed.");
        setSubmitting(false);
        return;
      }
      setPostAction(data.action);
      setPostFields(data.fields);
    } catch {
      setError("Network error. Try again.");
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
            <Feature>Nearby help &mdash; hospitals, clinics, pharmacies, public defibrillators</Feature>
            <Feature>Priority offline cache updates</Feature>
            <Feature>Supports development of the free app</Feature>
          </ul>
        </div>

        {status.isPremium ? (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-4">
            <div className="font-semibold text-emerald-300">You&apos;re on Premium</div>
            <div className="mt-1 text-xs text-zinc-300">
              {status.plan ? `Plan: ${status.plan}.` : null}{" "}
              {expiry ? `Renews / ends ${expiry.toLocaleDateString()}.` : null}
            </div>
            <Link
              href="/emergency"
              className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={startCheckout} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="space-y-2">
              <PlanRow
                selected={plan === "yearly"}
                onSelect={() => setPlan("yearly")}
                title="Yearly"
                price="₹499 / year"
                hint="Best value &mdash; about ₹42/month"
              />
              <PlanRow
                selected={plan === "monthly"}
                onSelect={() => setPlan("monthly")}
                title="Monthly"
                price="₹49 / month"
                hint="Cancel anytime"
              />
            </div>

            <label className="block">
              <span className="mb-1 block text-xs text-zinc-400">Phone number (for payment receipt)</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                required
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {!loading && !status.payuConfigured && (
              <p className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
                Payments aren&apos;t configured on this deployment. Set <code>PAYU_MERCHANT_KEY</code> and{" "}
                <code>PAYU_MERCHANT_SALT</code> environment variables.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !status.payuConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 font-semibold text-zinc-950 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Redirecting to PayU…" : "Subscribe with PayU"}
            </button>

            {!status.user && !loading && (
              <p className="text-center text-xs text-zinc-400">
                You&apos;ll be asked to sign in first.
              </p>
            )}

            <p className="text-center text-[11px] leading-relaxed text-zinc-500">
              Payments are processed by PayU. Cancel anytime by contacting support.
            </p>
          </form>
        )}
      </div>

      {postFields && (
        <form ref={formRef} action={postAction} method="POST" className="hidden">
          {Object.entries(postFields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </>
  );
}

function PlanRow({
  selected,
  onSelect,
  title,
  price,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
        selected ? "border-amber-500 bg-amber-500/10" : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-zinc-400">{hint}</div>
      </div>
      <div className="text-right">
        <div className="font-semibold">{price}</div>
        {selected && <div className="text-[11px] text-amber-300">Selected</div>}
      </div>
    </button>
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
