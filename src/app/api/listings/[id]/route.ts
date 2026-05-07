import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await settleExpiredAuctions();
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      seller: { select: { id: true, name: true, email: true } },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { bidder: { select: { id: true, name: true } } },
      },
      _count: { select: { bids: true, watches: true } },
    },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ listing });
}
