"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/marketplace/types";

export function BrowseFilters({
  initial,
}: {
  initial: { q: string; category: string; city: string };
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [city, setCity] = useState(initial.city);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    const qs = params.toString();
    router.push(qs ? `/marketplace?${qs}#browse` : "/marketplace#browse");
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-xl border bg-white p-3 shadow-sm md:grid-cols-[1fr,180px,180px,auto]"
    >
      <label className="flex items-center gap-2 rounded-lg border px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search gyms, studios, clubs…"
          className="h-10 w-full bg-transparent text-sm outline-none"
        />
      </label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-10 rounded-lg border bg-white px-3 text-sm"
      >
        <option value="">All categories</option>
        {BUSINESS_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City"
        className="h-10 rounded-lg border bg-white px-3 text-sm"
      />
      <button
        type="submit"
        className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Search
      </button>
    </form>
  );
}
