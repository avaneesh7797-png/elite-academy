import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await settleExpiredAuctions();
  const userId = session.user.id;

  const [selling, sold, won, bidding] = await Promise.all([
    prisma.listing.findMany({
      where: { sellerId: userId, status: "ACTIVE" },
      orderBy: { endsAt: "asc" },
      include: { _count: { select: { bids: true } } },
    }),
    prisma.listing.findMany({
      where: { sellerId: userId, status: "ENDED" },
      orderBy: { endsAt: "desc" },
      take: 20,
      include: { _count: { select: { bids: true } } },
    }),
    prisma.listing.findMany({
      where: { winnerId: userId, status: "ENDED" },
      orderBy: { endsAt: "desc" },
      take: 20,
      include: { _count: { select: { bids: true } } },
    }),
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        bids: { some: { bidderId: userId } },
      },
      orderBy: { endsAt: "asc" },
      include: { _count: { select: { bids: true } } },
    }),
  ]);

  return NextResponse.json({ selling, sold, won, bidding });
}
