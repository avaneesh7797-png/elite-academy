"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { parseJsonArray, themeClasses } from "@/lib/marketplace/types";

type Plan = {
  id: string;
  name: string;
  description: string;
  priceInr: number;
  durationDays: number;
};
type FAQ = { id: string; question: string; answer: string };
type Business = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  heroImage: string;
  gallery: string;
  hours: string;
  amenities: string;
  themeColor: string;
  chatGreeting: string;
  plans: Plan[];
  faqs: FAQ[];
};

export function PublicBusinessPage({ business }: { business: Business }) {
  const tc = themeClasses(business.themeColor);
  const amenities = useMemo(() => parseJsonArray(business.amenities), [business.amenities]);
  const hours = useMemo<Record<string, string>>(() => {
    try {
      const v = JSON.parse(business.hours || "{}");
      return typeof v === "object" && v !== null ? (v as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, [business.hours]);
  const gallery = useMemo(() => parseJsonArray(business.gallery), [business.gallery]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [selectedPlan, setSelectedPlan] = useState<string | null>(
    business.plans[0]?.id ?? null
  );

  function whatsappHref() {
    const n = business.whatsapp.replace(/[^\d]/g, "");
    if (!n) return null;
    return `https://wa.me/${n.length === 10 ? `91${n}` : n}`;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar — minimal, the gym's name, not the platform's */}
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white`}
              style={{ background: themeHex(business.themeColor) }}
            >
              {business.name.slice(0, 1).toUpperCase()}
            </div>
            <span className="truncate font-semibold">{business.name}</span>
          </div>
          <a
            href="#join"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tc.btn}`}
          >
            Join now
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div
          className={`relative h-[55vh] min-h-[360px] w-full overflow-hidden ${tc.bg}`}
          style={
            business.heroImage
              ? {
                  backgroundImage: `linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.55)), url(${business.heroImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="container relative flex h-full max-w-4xl flex-col justify-end pb-10">
            <span
              className={`inline-block w-fit rounded-full px-3 py-1 text-xs font-medium ${
                business.heroImage ? "bg-white/90 text-foreground" : tc.chip
              }`}
            >
              {business.category}
              {business.city ? ` · ${business.city}` : ""}
            </span>
            <h1
              className={`mt-3 text-4xl font-bold tracking-tight sm:text-5xl ${
                business.heroImage ? "text-white" : ""
              }`}
            >
              {business.name}
            </h1>
            {business.tagline && (
              <p
                className={`mt-3 max-w-2xl text-lg ${
                  business.heroImage ? "text-white/90" : "text-muted-foreground"
                }`}
              >
                {business.tagline}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="#join"
                className={`rounded-lg px-5 py-2.5 text-sm font-medium ${tc.btn}`}
              >
                Become a member
              </a>
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="rounded-lg border border-white/40 bg-white/90 px-5 py-2.5 text-sm font-medium text-foreground hover:bg-white"
                >
                  <Phone className="mr-2 inline h-4 w-4" />
                  Call
                </a>
              )}
              {whatsappHref() && (
                <a
                  href={whatsappHref()!}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/40 bg-emerald-600/95 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
                >
                  <MessageCircle className="mr-2 inline h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About + amenities */}
      <section className="container max-w-4xl py-12">
        {business.description && (
          <div className="prose max-w-none whitespace-pre-wrap text-base leading-relaxed">
            {business.description}
          </div>
        )}
        {amenities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold">What we offer</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {amenities.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${tc.text}`} />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Plans */}
      {business.plans.length > 0 && (
        <section id="plans" className={`border-y ${tc.bg}`}>
          <div className="container max-w-4xl py-12">
            <h2 className="text-2xl font-bold">Membership plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the plan that fits — pay directly to {business.name} once accepted.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {business.plans.map((p) => {
                const selected = selectedPlan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`rounded-2xl border bg-white p-5 text-left transition ${
                      selected
                        ? `border-foreground/40 ring-2 ${tc.ring} shadow-md`
                        : "hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{p.name}</h3>
                      {selected && <CheckCircle2 className={`h-5 w-5 ${tc.text}`} />}
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">
                        ₹{p.priceInr.toLocaleString("en-IN")}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">
                        {durationLabel(p.durationDays)}
                      </span>
                    </div>
                    {p.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Hours + location */}
      {(Object.keys(hours).length > 0 || business.address) && (
        <section className="container max-w-4xl py-12">
          <div className="grid gap-8 md:grid-cols-2">
            {Object.keys(hours).length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Clock className={`h-5 w-5 ${tc.text}`} />
                  Hours
                </h2>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {days
                    .filter((d) => hours[d])
                    .map((d) => (
                      <div key={d} className="flex justify-between border-b py-1.5">
                        <dt className="font-medium">{d}</dt>
                        <dd className="text-muted-foreground">{hours[d]}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}
            {business.address && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <MapPin className={`h-5 w-5 ${tc.text}`} />
                  Find us
                </h2>
                <p className="mt-4 text-sm">
                  {business.address}
                  {business.city ? `, ${business.city}` : ""}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${business.address} ${business.city}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-3 inline-block text-sm hover:underline ${tc.text}`}
                >
                  Open in Google Maps →
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="container max-w-5xl py-8">
          <h2 className="text-xl font-bold">Gallery</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {gallery.map((g, i) => (
              <div
                key={`${g}-${i}`}
                className="aspect-square rounded-xl bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${g})` }}
              />
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {business.faqs.length > 0 && (
        <section className="container max-w-4xl py-12">
          <h2 className="text-xl font-bold">Common questions</h2>
          <div className="mt-4 space-y-2">
            {business.faqs.map((f) => (
              <details
                key={f.id}
                className="rounded-xl border bg-white p-4 open:shadow-sm"
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {f.question}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Join CTA */}
      <section id="join" className={`border-t ${tc.bg}`}>
        <div className="container max-w-2xl py-12">
          <h2 className="text-2xl font-bold">Become a member</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill this and {business.name} will reach out to you directly.
          </p>
          <JoinForm
            slug={business.slug}
            plans={business.plans}
            selectedPlan={selectedPlan}
            onPlanChange={setSelectedPlan}
            tc={tc}
          />
        </div>
      </section>

      {/* Contact strip */}
      <section className="border-t bg-white">
        <div className="container max-w-4xl py-8">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-2">
                <Phone className={`h-4 w-4 ${tc.text}`} />
                {business.phone}
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="flex items-center gap-2">
                <Mail className={`h-4 w-4 ${tc.text}`} />
                {business.email}
              </a>
            )}
            {whatsappHref() && (
              <a
                href={whatsappHref()!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
              >
                <MessageCircle className={`h-4 w-4 ${tc.text}`} />
                {business.whatsapp}
              </a>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {business.name} · powered by{" "}
        <a href="/marketplace" className="hover:underline">
          FitSpot
        </a>
      </footer>

      <ChatWidget slug={business.slug} greeting={business.chatGreeting} businessName={business.name} themeColor={business.themeColor} />
    </div>
  );
}

function durationLabel(d: number) {
  if (d === 30) return "/ month";
  if (d === 90) return "/ 3 months";
  if (d === 180) return "/ 6 months";
  if (d === 365) return "/ year";
  return `/ ${d} days`;
}

function themeHex(theme: string) {
  const map: Record<string, string> = {
    emerald: "#10b981",
    rose: "#f43f5e",
    blue: "#3b82f6",
    violet: "#8b5cf6",
    amber: "#f59e0b",
    slate: "#475569",
  };
  return map[theme] || map.emerald;
}

function JoinForm({
  slug,
  plans,
  selectedPlan,
  onPlanChange,
  tc,
}: {
  slug: string;
  plans: Plan[];
  selectedPlan: string | null;
  onPlanChange: (id: string | null) => void;
  tc: ReturnType<typeof themeClasses>;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setError("Please add your name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/marketplace/public/${slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, planId: selectedPlan }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Couldn't send — try again.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mt-6 rounded-2xl border bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className={`mx-auto h-10 w-10 ${tc.text}`} />
        <h3 className="mt-3 text-lg font-semibold">You're on the list!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll reach out to you within a day. Check your email and phone.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border bg-white p-6 shadow-sm">
      {plans.length > 0 && (
        <div>
          <label className="text-sm font-medium">Plan</label>
          <select
            value={selectedPlan || ""}
            onChange={(e) => onPlanChange(e.target.value || null)}
            className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <option value="">Not sure yet</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.priceInr.toLocaleString("en-IN")} {durationLabel(p.durationDays)}
              </option>
            ))}
          </select>
        </div>
      )}
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Your name"
        className="block w-full rounded-lg border px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
        required
      />
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="Email"
        className="block w-full rounded-lg border px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
        required
      />
      <input
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        placeholder="Phone (so we can call back)"
        className="block w-full rounded-lg border px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
      <textarea
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        placeholder="Anything else? (optional)"
        rows={3}
        maxLength={500}
        className="block w-full rounded-lg border px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${tc.btn} disabled:opacity-50`}
      >
        <Send className="h-4 w-4" />
        {submitting ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}

function ChatWidget({
  slug,
  greeting,
  businessName,
  themeColor,
}: {
  slug: string;
  greeting: string;
  businessName: string;
  themeColor: string;
}) {
  const tc = themeClasses(themeColor);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "bot" | "you"; text: string }[]>([
    { role: "bot", text: greeting || `Hi! Ask me anything about ${businessName}.` },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "you", text }]);
    setInput("");
    setSending(true);
    try {
      const r = await fetch(`/api/marketplace/public/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const j = await r.json();
      setMessages((m) => [
        ...m,
        { role: "bot", text: r.ok ? j.reply : "Something went wrong." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Network error — try again." }]);
    } finally {
      setSending(false);
    }
  }

  const suggestions = ["What are your plans?", "What are your hours?", "Where are you located?"];

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {open ? (
        <div className="flex h-[480px] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ background: themeHex(themeColor) }}
          >
            <div className="font-semibold">{businessName} assistant</div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "you" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "you"
                      ? `${tc.btn}`
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                    }}
                    className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm">…</div>
              </div>
            )}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tc.btn} disabled:opacity-50`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`flex h-14 items-center gap-2 rounded-full px-5 text-sm font-medium shadow-2xl ${tc.btn}`}
        >
          <MessageCircle className="h-5 w-5" />
          Ask {businessName}
        </button>
      )}
    </div>
  );
}
