import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await settleExpiredAuctions();
  const watches = await prisma.watch.findMany({
    where: { userId: session.user.id },
    include: {
      listing: {
        include: { category: true, _count: { select: { bids: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    listings: watches.map((w) => w.listing),
    listingIds: watches.map((w) => w.listingId),
  });
}
