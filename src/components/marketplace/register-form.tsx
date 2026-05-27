"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { BUSINESS_CATEGORIES, slugify } from "@/lib/marketplace/types";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    const s = slugify(slug);
    if (s.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/marketplace/slug-check?slug=${encodeURIComponent(s)}`, {
          signal: ctrl.signal,
        });
        const j = await r.json();
        setAvailable(Boolean(j.available));
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !city.trim() || slugify(slug).length < 3) {
      setError("Please fill in all fields.");
      return;
    }
    if (available === false) {
      setError("That link is taken — try another.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/marketplace/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          city: city.trim(),
          slug: slugify(slug),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Couldn't create listing");
        setSubmitting(false);
        return;
      }
      router.push(`/marketplace/dashboard/${j.business.id}?new=1`);
    } catch (err) {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <label className="text-sm font-medium">Business name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Iron Fitness"
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Mumbai"
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Your page link</label>
        <div className="mt-1 flex overflow-hidden rounded-lg border focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200">
          <span className="border-r bg-muted px-3 py-2 text-sm text-muted-foreground">
            /g/
          </span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="iron-fitness"
            className="flex-1 bg-white px-3 py-2 text-sm outline-none"
            required
          />
          <span className="flex items-center px-3">
            {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {!checking && available === true && <Check className="h-4 w-4 text-emerald-600" />}
            {!checking && available === false && <X className="h-4 w-4 text-red-600" />}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {slug ? (
            <>
              Your page will be at <code className="rounded bg-muted px-1">/g/{slugify(slug)}</code>
            </>
          ) : (
            "Lowercase letters, numbers and hyphens only."
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || available === false}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </>
        ) : (
          "Continue to payment →"
        )}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Next step: pay the ₹7,000 one-time listing fee via PayU.
      </p>
    </form>
  );
}
