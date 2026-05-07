"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ListingCard, type ListingCardData } from "@/components/listing-card";

export default function WatchlistPage() {
  const router = useRouter();
  const { status } = useSession();
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/watchlist");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/watchlist", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="container py-8">
      <h1 className="mb-4 text-2xl font-bold">Your watchlist</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : listings.length === 0 ? (
        <p className="text-muted-foreground">You haven&apos;t saved any listings yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
