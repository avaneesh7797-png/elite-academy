import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";

export default async function SellerPage({ params }: { params: { id: string } }) {
  await settleExpiredAuctions();
  const seller = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { listings: true } },
    },
  });
  if (!seller) notFound();

  const listings = await prisma.listing.findMany({
    where: { sellerId: seller.id, status: "ACTIVE" },
    orderBy: { endsAt: "asc" },
    include: { category: true, _count: { select: { bids: true } } },
  });

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{seller.name}</h1>
        <p className="text-sm text-muted-foreground">
          Member since {seller.createdAt.toLocaleDateString()} · {seller._count.listings} total listings
        </p>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Active listings ({listings.length})</h2>
      {listings.length === 0 ? (
        <p className="text-muted-foreground">No active listings.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={{
                ...l,
                endsAt: l.endsAt.toISOString(),
                category: l.category,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
