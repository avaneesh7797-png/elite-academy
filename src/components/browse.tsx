"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = { id: string; name: string; slug: string };

export function Browse() {
  const router = useRouter();
  const params = useSearchParams();

  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const condition = params.get("condition") ?? "";
  const sort = params.get("sort") ?? "ending";

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (minPrice) sp.set("minPrice", minPrice);
    if (maxPrice) sp.set("maxPrice", maxPrice);
    if (condition) sp.set("condition", condition);
    if (sort) sp.set("sort", sort);
    fetch(`/api/listings?${sp.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .finally(() => setLoading(false));
  }, [q, category, minPrice, maxPrice, condition, sort]);

  const update = (key: string, value: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.push(`/?${sp.toString()}`);
  };

  const onFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams(params.toString());
    for (const k of ["minPrice", "maxPrice", "condition"]) {
      const v = String(fd.get(k) || "").trim();
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`/?${sp.toString()}`);
  };

  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <div>
            <h3 className="mb-2 font-semibold">Categories</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  onClick={() => update("category", "")}
                  className={`block w-full text-left hover:underline ${!category ? "font-semibold text-primary" : ""}`}
                >
                  All
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => update("category", c.slug)}
                    className={`block w-full text-left hover:underline ${category === c.slug ? "font-semibold text-primary" : ""}`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={onFilter} className="space-y-3">
            <h3 className="font-semibold">Filters</h3>
            <div className="space-y-1">
              <Label htmlFor="minPrice" className="text-xs">Min price</Label>
              <Input id="minPrice" name="minPrice" type="number" min="0" step="1" defaultValue={minPrice} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxPrice" className="text-xs">Max price</Label>
              <Input id="maxPrice" name="maxPrice" type="number" min="0" step="1" defaultValue={maxPrice} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="condition" className="text-xs">Condition</Label>
              <select
                id="condition"
                name="condition"
                defaultValue={condition}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="NEW">New</option>
                <option value="USED">Used</option>
                <option value="REFURBISHED">Refurbished</option>
              </select>
            </div>
            <Button type="submit" size="sm" className="w-full">Apply</Button>
          </form>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${listings.length} listing${listings.length === 1 ? "" : "s"}`}
              {q && <> for &quot;{q}&quot;</>}
            </p>
            <select
              value={sort}
              onChange={(e) => update("sort", e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ending">Ending soonest</option>
              <option value="newest">Newest</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
            </select>
          </div>

          {!loading && listings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No listings yet. Be the first to{" "}
              <a href="/sell" className="text-primary hover:underline">list an item</a>.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
