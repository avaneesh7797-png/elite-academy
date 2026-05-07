import { prisma } from "@/lib/prisma";

/**
 * Closes any auctions whose end time has passed: marks them ENDED, sets the
 * winner to the highest bidder (if any), and creates notifications for both
 * the winner and the seller. Safe to call frequently — it's a no-op when
 * nothing has expired.
 */
export async function settleExpiredAuctions() {
  const now = new Date();
  const expired = await prisma.listing.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    include: {
      bids: { orderBy: { amount: "desc" }, take: 1, include: { bidder: true } },
    },
  });

  for (const listing of expired) {
    const top = listing.bids[0];
    if (top) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { status: "ENDED", winnerId: top.bidderId, currentPrice: top.amount },
      });
      await prisma.notification.createMany({
        data: [
          {
            userId: top.bidderId,
            type: "WON",
            message: `You won "${listing.title}" for $${top.amount.toFixed(2)}!`,
            link: `/listing/${listing.id}`,
          },
          {
            userId: listing.sellerId,
            type: "SOLD",
            message: `Your listing "${listing.title}" sold for $${top.amount.toFixed(2)}.`,
            link: `/listing/${listing.id}`,
          },
        ],
      });
    } else {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { status: "ENDED" },
      });
      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          type: "EXPIRED",
          message: `Your listing "${listing.title}" ended without bids.`,
          link: `/listing/${listing.id}`,
        },
      });
    }
  }
}
