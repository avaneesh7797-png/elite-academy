"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Account = {
  selling: ListingCardData[];
  sold: ListingCardData[];
  won: ListingCardData[];
  bidding: ListingCardData[];
};

const TABS = [
  { id: "selling", label: "Active listings" },
  { id: "bidding", label: "I'm bidding on" },
  { id: "won", label: "Items I won" },
  { id: "sold", label: "Sold" },
] as const;

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState<Account | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("selling");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/account");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [status]);

  const items = data?.[tab] ?? [];

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My account</h1>
          {session?.user && (
            <p className="text-sm text-muted-foreground">
              {session.user.name} · {session.user.email}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/sell">+ List a new item</Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({data?.[t.id]?.length ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
