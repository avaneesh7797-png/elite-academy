"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Clock, Gavel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, timeRemaining } from "@/lib/utils";

export type ListingCardData = {
  id: string;
  title: string;
  imageUrl: string;
  currentPrice: number;
  buyNowPrice: number | null;
  endsAt: string;
  status: string;
  condition: string;
  category?: { name: string; slug: string };
  _count?: { bids: number };
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const [time, setTime] = useState(() => timeRemaining(listing.endsAt));

  useEffect(() => {
    const i = setInterval(() => setTime(timeRemaining(listing.endsAt)), 1000);
    return () => clearInterval(i);
  }, [listing.endsAt]);

  return (
    <Link href={`/listing/${listing.id}`} className="group">
      <Card className="overflow-hidden transition hover:shadow-md">
        <div className="relative aspect-square w-full bg-muted">
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
          {listing.buyNowPrice && (
            <Badge variant="success" className="absolute right-2 top-2">
              Buy now {formatCurrency(listing.buyNowPrice)}
            </Badge>
          )}
        </div>
        <CardContent className="space-y-2 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{listing.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">{formatCurrency(listing.currentPrice)}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Gavel className="h-3 w-3" />
              {listing._count?.bids ?? 0} bids
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {time.label}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
