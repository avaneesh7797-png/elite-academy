import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";
import { minNextBid } from "@/lib/utils";

export const dynamic = "force-dynamic";

const schema = z.object({ amount: z.number().positive().max(10_000_000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in to bid." }, { status: 401 });
  }

  await settleExpiredAuctions();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid bid amount." }, { status: 400 });
  }
  const amount = Math.round(parsed.data.amount * 100) / 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: params.id },
        include: { bids: { orderBy: { amount: "desc" }, take: 1 } },
      });
      if (!listing) throw new Error("Listing not found.");
      if (listing.status !== "ACTIVE") throw new Error("This auction is no longer active.");
      if (listing.endsAt.getTime() <= Date.now()) throw new Error("This auction has ended.");
      if (listing.sellerId === session.user.id) {
        throw new Error("You cannot bid on your own listing.");
      }

      const previousTop = listing.bids[0] ?? null;
      const required = minNextBid(listing.currentPrice, listing.startPrice, !!previousTop);
      if (amount < required) {
        throw new Error(`Minimum bid is $${required.toFixed(2)}.`);
      }

      const bid = await tx.bid.create({
        data: { amount, listingId: listing.id, bidderId: session.user.id },
      });

      await tx.listing.update({
        where: { id: listing.id },
        data: { currentPrice: amount },
      });

      // Notify the previous top bidder if they were outbid (and aren't this user).
      if (previousTop && previousTop.bidderId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: previousTop.bidderId,
            type: "OUTBID",
            message: `You've been outbid on "${listing.title}". New bid: $${amount.toFixed(2)}.`,
            link: `/listing/${listing.id}`,
          },
        });
      }

      // Notify watchers (other than the bidder).
      const watchers = await tx.watch.findMany({
        where: { listingId: listing.id, NOT: { userId: session.user.id } },
        select: { userId: true },
      });
      if (watchers.length) {
        await tx.notification.createMany({
          data: watchers.map((w) => ({
            userId: w.userId,
            type: "WATCH_BID",
            message: `New bid on "${listing.title}": $${amount.toFixed(2)}.`,
            link: `/listing/${listing.id}`,
          })),
        });
      }

      return bid;
    });

    return NextResponse.json({ bid: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to place bid.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
