import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in to buy." }, { status: 401 });
  }

  await settleExpiredAuctions();

  try {
    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: params.id } });
      if (!listing) throw new Error("Listing not found.");
      if (listing.status !== "ACTIVE") throw new Error("This listing is no longer active.");
      if (listing.endsAt.getTime() <= Date.now()) throw new Error("This listing has ended.");
      if (!listing.buyNowPrice) throw new Error("Buy-it-now is not available for this listing.");
      if (listing.sellerId === session.user.id) throw new Error("You cannot buy your own listing.");

      await tx.listing.update({
        where: { id: listing.id },
        data: {
          status: "ENDED",
          winnerId: session.user.id,
          currentPrice: listing.buyNowPrice,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: session.user.id,
            type: "WON",
            message: `You bought "${listing.title}" for $${listing.buyNowPrice.toFixed(2)}.`,
            link: `/listing/${listing.id}`,
          },
          {
            userId: listing.sellerId,
            type: "SOLD",
            message: `Your listing "${listing.title}" was bought for $${listing.buyNowPrice.toFixed(2)}.`,
            link: `/listing/${listing.id}`,
          },
        ],
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to buy.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
