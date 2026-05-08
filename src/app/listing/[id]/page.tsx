"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Clock, Gavel, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, timeRemaining, minNextBid } from "@/lib/utils";

type Bid = {
  id: string;
  amount: number;
  createdAt: string;
  bidder: { id: string; name: string };
};

type Listing = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  condition: string;
  startPrice: number;
  currentPrice: number;
  buyNowPrice: number | null;
  endsAt: string;
  status: string;
  winnerId: string | null;
  category: { id: string; name: string; slug: string };
  seller: { id: string; name: string };
  bids: Bid[];
  _count: { bids: number; watches: number };
};

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState<{ ended: boolean; label: string } | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  const fetchListing = useCallback(async () => {
    const r = await fetch(`/api/listings/${params.id}`, { cache: "no-store" });
    if (!r.ok) {
      setLoading(false);
      return;
    }
    const d = await r.json();
    setListing(d.listing);
    setLoading(false);
  }, [params.id]);

  const fetchWatchStatus = useCallback(async () => {
    if (status !== "authenticated") return;
    const r = await fetch("/api/watchlist", { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setWatching(!!d.listingIds?.includes(params.id));
  }, [status, params.id]);

  useEffect(() => {
    fetchListing();
    fetchWatchStatus();
  }, [fetchListing, fetchWatchStatus]);

  useEffect(() => {
    if (!listing) return;
    const tick = () => setTime(timeRemaining(listing.endsAt));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [listing]);

  // Poll for new bids while the auction is active.
  useEffect(() => {
    if (!listing || listing.status !== "ACTIVE") return;
    const i = setInterval(fetchListing, 4000);
    return () => clearInterval(i);
  }, [listing, fetchListing]);

  if (loading) return <div className="container py-12 text-muted-foreground">Loading...</div>;
  if (!listing) return <div className="container py-12">Listing not found.</div>;

  const isSeller = session?.user?.id === listing.seller.id;
  const isWinner = listing.winnerId && session?.user?.id === listing.winnerId;
  const required = minNextBid(listing.currentPrice, listing.startPrice, listing._count.bids > 0);
  const ended = listing.status !== "ACTIVE" || (time?.ended ?? false);

  const onBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/listing/${listing.id}`);
      return;
    }
    const amount = Number(bidAmount);
    if (!amount || amount < required) {
      setError(`Minimum bid is ${formatCurrency(required)}.`);
      return;
    }
    const r = await fetch(`/api/listings/${listing.id}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Bid failed");
      return;
    }
    setInfo("Bid placed!");
    setBidAmount("");
    fetchListing();
  };

  const onBuyNow = async () => {
    if (!listing.buyNowPrice) return;
    setError(null);
    setInfo(null);
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/listing/${listing.id}`);
      return;
    }
    if (!confirm(`Buy this item now for ${formatCurrency(listing.buyNowPrice)}?`)) return;
    const r = await fetch(`/api/listings/${listing.id}/buy`, { method: "POST" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Purchase failed");
      return;
    }
    setInfo("Purchase complete!");
    fetchListing();
  };

  const onToggleWatch = async () => {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/listing/${listing.id}`);
      return;
    }
    const r = await fetch(`/api/listings/${listing.id}/watch`, { method: "POST" });
    if (!r.ok) return;
    const d = await r.json();
    setWatching(!!d.watching);
  };

  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
            <Image src={listing.imageUrl} alt={listing.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{listing.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{listing.condition}</Badge>
                <Badge variant="outline">{listing.category.name}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bid history ({listing._count.bids})</CardTitle>
            </CardHeader>
            <CardContent>
              {listing.bids.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bids yet — be the first.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {listing.bids.map((b) => (
                    <li key={b.id} className="flex items-center justify-between py-2">
                      <span className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" /> {b.bidder.name}
                      </span>
                      <span className="font-medium">{formatCurrency(b.amount)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h1 className="text-xl font-semibold leading-tight">{listing.title}</h1>

              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {listing._count.bids > 0 ? "Current bid" : "Starting price"}
                </p>
                <p className="text-3xl font-bold">{formatCurrency(listing.currentPrice)}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Gavel className="h-4 w-4" /> {listing._count.bids} bids
                </p>
              </div>

              <div className="rounded-md bg-muted p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  {ended ? "Auction ended" : `Ends in ${time?.label ?? ""}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(listing.endsAt).toLocaleString()}
                </p>
              </div>

              {ended ? (
                <div className="rounded-md border bg-card p-3 text-sm">
                  {listing.winnerId ? (
                    isWinner ? (
                      <p className="font-medium text-emerald-600">You won this auction!</p>
                    ) : (
                      <p>Auction closed. Winning bid: {formatCurrency(listing.currentPrice)}.</p>
                    )
                  ) : (
                    <p>Auction ended without bids.</p>
                  )}
                </div>
              ) : isSeller ? (
                <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                  This is your listing. You can&apos;t bid on it.
                </p>
              ) : (
                <>
                  <form onSubmit={onBid} className="space-y-2">
                    <Label htmlFor="bidAmount">Your bid (min {formatCurrency(required)})</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bidAmount"
                        type="number"
                        step="0.01"
                        min={required}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={required.toFixed(2)}
                      />
                      <Button type="submit">Place bid</Button>
                    </div>
                  </form>
                  {listing.buyNowPrice && (
                    <Button variant="secondary" className="w-full" onClick={onBuyNow}>
                      Buy it now for {formatCurrency(listing.buyNowPrice)}
                    </Button>
                  )}
                </>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
              {info && <p className="text-sm text-emerald-600">{info}</p>}

              {!isSeller && (
                <Button variant="outline" className="w-full" onClick={onToggleWatch}>
                  <Heart className={`mr-2 h-4 w-4 ${watching ? "fill-red-500 text-red-500" : ""}`} />
                  {watching ? "Watching" : "Add to watchlist"} ({listing._count.watches})
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-6 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <UserIcon className="h-4 w-4" /> Sold by{" "}
                <Link href={`/seller/${listing.seller.id}`} className="text-primary hover:underline">
                  {listing.seller.name}
                </Link>
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" /> Bids are binding once placed
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
