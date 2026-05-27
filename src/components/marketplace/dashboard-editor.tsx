"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Bot,
  Check,
  ExternalLink,
  Eye,
  HelpCircle,
  Loader2,
  Mail,
  Palette,
  Plus,
  Settings2,
  Tags,
  Trash2,
  Users,
} from "lucide-react";
import {
  BUSINESS_CATEGORIES,
  THEME_COLORS,
  parseJsonArray,
  themeClasses,
} from "@/lib/marketplace/types";
import { MARKETPLACE_PAYU_LINK } from "@/lib/marketplace/payu-link";

type Plan = {
  id: string;
  name: string;
  description: string;
  priceInr: number;
  durationDays: number;
};
type FAQ = { id: string; question: string; answer: string };
type Application = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string | Date;
  planId: string | null;
};
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
  status: string;
  payuTxnId: string | null;
  plans: Plan[];
  faqs: FAQ[];
  applications: Application[];
};

const TABS = [
  { id: "profile", label: "Profile", icon: Settings2 },
  { id: "plans", label: "Plans", icon: Tags },
  { id: "design", label: "Design & chatbot", icon: Palette },
  { id: "leads", label: "Member leads", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DashboardEditor({ initialBusiness }: { initialBusiness: Business }) {
  const searchParams = useSearchParams();
  const isNew = searchParams?.get("new") === "1";
  const [business, setBusiness] = useState<Business>(initialBusiness);
  const [tab, setTab] = useState<TabId>("profile");
  const tc = themeClasses(business.themeColor);

  const newLeadCount = business.applications.filter((a) => a.status === "new").length;

  return (
    <div className="container py-8">
      <Link
        href="/marketplace/dashboard"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← All listings
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{business.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                business.status === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {business.status === "active" ? "Live" : "Awaiting payment"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            yoursite.com/g/{business.slug}
          </p>
        </div>
        {business.status === "active" && (
          <Link
            href={`/g/${business.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-muted"
          >
            <Eye className="h-4 w-4" /> View public page
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {business.status === "pending" && (
        <PaymentBanner
          business={business}
          onPaid={(b) => setBusiness((prev) => ({ ...prev, ...b }))}
          newlyCreated={isNew}
        />
      )}

      <div className="mt-6 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition ${
              tab === t.id
                ? `border-emerald-600 ${tc.text} font-medium`
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.id === "leads" && newLeadCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-1.5 text-xs font-medium text-white">
                {newLeadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "profile" && (
          <ProfileTab
            business={business}
            onUpdate={(b) => setBusiness((prev) => ({ ...prev, ...b }))}
            disabled={business.status === "pending"}
          />
        )}
        {tab === "plans" && (
          <PlansTab
            business={business}
            onChange={(plans) => setBusiness((prev) => ({ ...prev, plans }))}
            disabled={business.status === "pending"}
          />
        )}
        {tab === "design" && (
          <DesignTab
            business={business}
            onUpdate={(b) => setBusiness((prev) => ({ ...prev, ...b }))}
            onFaqChange={(faqs) => setBusiness((prev) => ({ ...prev, faqs }))}
            disabled={business.status === "pending"}
          />
        )}
        {tab === "leads" && (
          <LeadsTab
            business={business}
            onChange={(applications) =>
              setBusiness((prev) => ({ ...prev, applications }))
            }
          />
        )}
      </div>
    </div>
  );
}

function PaymentBanner({
  business,
  onPaid,
  newlyCreated,
}: {
  business: Business;
  onPaid: (b: Partial<Business>) => void;
  newlyCreated: boolean;
}) {
  const [txn, setTxn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  function openPayU() {
    setOpened(true);
    const w = window.open(MARKETPLACE_PAYU_LINK, "_blank", "noopener");
    if (!w) window.location.href = MARKETPLACE_PAYU_LINK;
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!txn.trim()) {
      setError("Enter the Transaction ID from PayU.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/marketplace/businesses/${business.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payuTxnId: txn.trim() }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Couldn't confirm");
        setSubmitting(false);
        return;
      }
      onPaid({
        status: j.business.status,
        payuTxnId: j.business.payuTxnId,
      });
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-lg font-bold text-amber-900">
            {newlyCreated ? "🎉 Listing created — one step left!" : "Activate your listing"}
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            Pay the one-time ₹7,000 listing fee via PayU. Your page goes live the moment
            you submit the Transaction ID.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Step 1</div>
          <p className="mt-1 text-sm">
            Pay ₹7,000 on PayU. Use any of your gym info as the customer name.
          </p>
          <button
            onClick={openPayU}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Pay ₹7,000 on PayU <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={confirm} className="rounded-xl border bg-white p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Step 2</div>
          <p className="mt-1 text-sm">
            Paste the PayU Transaction ID from your confirmation page.
          </p>
          <input
            value={txn}
            onChange={(e) => setTxn(e.target.value)}
            placeholder="e.g. 4034831234567"
            className="mt-3 block w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !opened}
            title={!opened ? "Open the PayU page first" : ""}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Activating…
              </>
            ) : (
              "Activate listing"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium">{label}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`block w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-muted ${props.className || ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`block w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-muted ${props.className || ""}`}
    />
  );
}

function ProfileTab({
  business,
  onUpdate,
  disabled,
}: {
  business: Business;
  onUpdate: (b: Partial<Business>) => void;
  disabled: boolean;
}) {
  const [form, setForm] = useState({
    name: business.name,
    category: business.category,
    tagline: business.tagline,
    description: business.description,
    address: business.address,
    city: business.city,
    phone: business.phone,
    whatsapp: business.whatsapp,
    email: business.email,
    heroImage: business.heroImage,
  });
  const initialAmenities = useMemo(() => parseJsonArray(business.amenities), [business.amenities]);
  const [amenities, setAmenities] = useState<string[]>(initialAmenities);
  const [newAmenity, setNewAmenity] = useState("");
  const initialHours = useMemo<Record<string, string>>(() => {
    try {
      const v = JSON.parse(business.hours || "{}");
      return typeof v === "object" && v !== null ? (v as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, [business.hours]);
  const [hours, setHours] = useState<Record<string, string>>(initialHours);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const r = await fetch(`/api/marketplace/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amenities, hours }),
      });
      if (r.ok) {
        const j = await r.json();
        onUpdate(j.business);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    } finally {
      setSaving(false);
    }
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">About your business</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Name">
            <Input
              value={form.name}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Category">
            <select
              disabled={disabled}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="block w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-muted"
            >
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Tagline" hint="One sentence that hooks visitors.">
            <Input
              value={form.tagline}
              disabled={disabled}
              maxLength={160}
              placeholder="Strength training in the heart of Bandra"
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </FormField>
          <FormField label="Hero image URL" hint="Paste a link to your best photo.">
            <Input
              value={form.heroImage}
              disabled={disabled}
              placeholder="https://…"
              onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="About / description" hint="Tell visitors what makes you special.">
            <Textarea
              value={form.description}
              disabled={disabled}
              rows={5}
              maxLength={4000}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Contact & location</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Address">
            <Input
              value={form.address}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </FormField>
          <FormField label="City">
            <Input
              value={form.city}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={form.phone}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="WhatsApp">
            <Input
              value={form.whatsapp}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={form.email}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Hours</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {days.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0 font-medium">{d}</span>
              <input
                disabled={disabled}
                value={hours[d] || ""}
                placeholder="6:00 AM – 10:00 PM"
                onChange={(e) => setHours({ ...hours, [d]: e.target.value })}
                className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-muted"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">What you offer</h3>
        <p className="text-xs text-muted-foreground">
          List facilities, classes, equipment — anything that'd attract members.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {amenities.map((a, i) => (
            <span
              key={`${a}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800"
            >
              {a}
              <button
                type="button"
                disabled={disabled}
                onClick={() => setAmenities(amenities.filter((_, idx) => idx !== i))}
                className="ml-1 rounded-full hover:bg-emerald-200"
                aria-label={`Remove ${a}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            disabled={disabled}
            value={newAmenity}
            placeholder="e.g. Free weights, Steam room, Yoga classes"
            onChange={(e) => setNewAmenity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newAmenity.trim()) {
                e.preventDefault();
                setAmenities([...amenities, newAmenity.trim()]);
                setNewAmenity("");
              }
            }}
          />
          <button
            type="button"
            disabled={disabled || !newAmenity.trim()}
            onClick={() => {
              if (!newAmenity.trim()) return;
              setAmenities([...amenities, newAmenity.trim()]);
              setNewAmenity("");
            }}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border bg-white p-3 shadow-lg">
        <div className="text-sm">
          {saved && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </button>
      </div>
    </div>
  );
}

function PlansTab({
  business,
  onChange,
  disabled,
}: {
  business: Business;
  onChange: (plans: Plan[]) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    priceInr: 0,
    durationDays: 30,
  });
  const [busy, setBusy] = useState(false);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim() || draft.priceInr < 0) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/marketplace/businesses/${business.id}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (r.ok) {
        onChange([...business.plans, j.plan]);
        setDraft({ name: "", description: "", priceInr: 0, durationDays: 30 });
      }
    } finally {
      setBusy(false);
    }
  }

  async function deletePlan(id: string) {
    const r = await fetch(`/api/marketplace/businesses/${business.id}/plans/${id}`, {
      method: "DELETE",
    });
    if (r.ok) onChange(business.plans.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Membership plans</h3>
        <p className="text-xs text-muted-foreground">
          You decide your own pricing. Add a monthly, quarterly, or yearly plan.
        </p>
        <div className="mt-4 space-y-3">
          {business.plans.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No plans yet — add one below.
            </p>
          )}
          {business.plans.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  ₹{p.priceInr.toLocaleString("en-IN")} ·{" "}
                  {p.durationDays === 30
                    ? "monthly"
                    : p.durationDays === 90
                      ? "quarterly"
                      : p.durationDays === 365
                        ? "yearly"
                        : `${p.durationDays} days`}
                </div>
                {p.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.description}</div>
                )}
              </div>
              <button
                onClick={() => deletePlan(p.id)}
                disabled={disabled}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                aria-label="Delete plan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={addPlan} className="rounded-xl border bg-white p-5">
        <h4 className="font-semibold">Add a plan</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <FormField label="Plan name">
            <Input
              value={draft.name}
              disabled={disabled}
              placeholder="Monthly"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </FormField>
          <FormField label="Price (₹)">
            <Input
              type="number"
              min={0}
              disabled={disabled}
              value={draft.priceInr || ""}
              onChange={(e) =>
                setDraft({ ...draft, priceInr: parseInt(e.target.value || "0", 10) })
              }
            />
          </FormField>
          <FormField label="Duration">
            <select
              disabled={disabled}
              value={draft.durationDays}
              onChange={(e) =>
                setDraft({ ...draft, durationDays: parseInt(e.target.value, 10) })
              }
              className="block w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-muted"
            >
              <option value={30}>1 month</option>
              <option value={90}>3 months</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
            </select>
          </FormField>
          <FormField label="Description (optional)">
            <Input
              disabled={disabled}
              value={draft.description}
              placeholder="What's included"
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </FormField>
        </div>
        <button
          type="submit"
          disabled={busy || disabled || !draft.name.trim()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add plan
        </button>
      </form>
    </div>
  );
}

function DesignTab({
  business,
  onUpdate,
  onFaqChange,
  disabled,
}: {
  business: Business;
  onUpdate: (b: Partial<Business>) => void;
  onFaqChange: (faqs: FAQ[]) => void;
  disabled: boolean;
}) {
  const [theme, setTheme] = useState(business.themeColor);
  const [greeting, setGreeting] = useState(business.chatGreeting);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [adding, setAdding] = useState(false);

  async function saveDesign() {
    setSaving(true);
    try {
      const r = await fetch(`/api/marketplace/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor: theme, chatGreeting: greeting }),
      });
      if (r.ok) {
        const j = await r.json();
        onUpdate(j.business);
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }

  async function addFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.question.trim() || !draft.answer.trim()) return;
    setAdding(true);
    try {
      const r = await fetch(`/api/marketplace/businesses/${business.id}/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (r.ok) {
        onFaqChange([...business.faqs, j.faq]);
        setDraft({ question: "", answer: "" });
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteFaq(id: string) {
    const r = await fetch(`/api/marketplace/businesses/${business.id}/faqs/${id}`, {
      method: "DELETE",
    });
    if (r.ok) onFaqChange(business.faqs.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Theme colour</h3>
        <p className="text-xs text-muted-foreground">
          Sets the accent colour on your public page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {THEME_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setTheme(c.id)}
              disabled={disabled}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                theme === c.id ? "border-foreground ring-2 ring-foreground/20" : ""
              } disabled:opacity-50`}
            >
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ background: c.hex }}
              />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 text-emerald-700" />
          <div>
            <h3 className="font-semibold">Your custom chatbot</h3>
            <p className="text-xs text-muted-foreground">
              Visitors can ask anything about your business. The bot answers from your
              profile, plans, and the Q&A entries you add below. No generic AI — fully
              customised to your business.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <FormField label="Opening greeting" hint="The first thing visitors see in the chat.">
            <Input
              disabled={disabled}
              value={greeting}
              maxLength={300}
              onChange={(e) => setGreeting(e.target.value)}
            />
          </FormField>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold">Q&A — what the bot knows</h4>
          <div className="mt-3 space-y-2">
            {business.faqs.length === 0 && (
              <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                Add common questions so the bot can answer them. Hours, pricing, location and
                contact are answered automatically from your profile.
              </p>
            )}
            {business.faqs.map((f) => (
              <div key={f.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-1.5 font-medium">
                      <HelpCircle className="h-4 w-4 text-emerald-700" />
                      {f.question}
                    </div>
                    <p className="mt-1 text-muted-foreground">{f.answer}</p>
                  </div>
                  <button
                    onClick={() => deleteFaq(f.id)}
                    disabled={disabled}
                    className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Delete Q&A"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={addFaq} className="mt-3 rounded-lg border border-dashed p-3">
            <div className="grid gap-2">
              <Input
                disabled={disabled}
                placeholder="Question — e.g. Do you offer trial classes?"
                value={draft.question}
                onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              />
              <Textarea
                disabled={disabled}
                rows={2}
                placeholder="Answer — what the bot should reply with"
                value={draft.answer}
                onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={
                adding || disabled || !draft.question.trim() || !draft.answer.trim()
              }
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {adding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add Q&A
            </button>
          </form>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border bg-white p-3 shadow-lg">
        <div className="text-sm">
          {savedAt && Date.now() - savedAt < 2000 && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
        <button
          onClick={saveDesign}
          disabled={saving || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </button>
      </div>
    </div>
  );
}

function LeadsTab({
  business,
  onChange,
}: {
  business: Business;
  onChange: (apps: Application[]) => void;
}) {
  async function setStatus(appId: string, status: string) {
    const r = await fetch(
      `/api/marketplace/businesses/${business.id}/applications/${appId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    if (r.ok) {
      onChange(business.applications.map((a) => (a.id === appId ? { ...a, status } : a)));
    }
  }

  const planNameById = new Map(business.plans.map((p) => [p.id, p.name] as const));

  return (
    <div className="space-y-3">
      {business.applications.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto h-6 w-6" />
          <p className="mt-2">No member leads yet — share your page to start collecting them.</p>
        </div>
      ) : (
        business.applications.map((a) => (
          <div key={a.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{a.name}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === "new"
                        ? "bg-blue-100 text-blue-800"
                        : a.status === "contacted"
                          ? "bg-amber-100 text-amber-800"
                          : a.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString("en-IN")}
                  {a.planId && planNameById.get(a.planId) && (
                    <> · interested in {planNameById.get(a.planId)}</>
                  )}
                </div>
                <div className="mt-2 grid gap-1 text-sm">
                  <a
                    href={`mailto:${a.email}`}
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                  >
                    <Mail className="h-3 w-3" /> {a.email}
                  </a>
                  {a.phone && <div className="text-muted-foreground">📱 {a.phone}</div>}
                  {a.message && (
                    <div className="mt-1 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                      {a.message}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {(["new", "contacted", "accepted", "declined"] as const)
                  .filter((s) => s !== a.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(a.id, s)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Mark {s}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
