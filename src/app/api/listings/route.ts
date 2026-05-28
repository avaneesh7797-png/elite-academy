import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  imageUrl: z.string().min(1),
  categoryId: z.string().min(1),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]).default("USED"),
  startPrice: z.number().positive().max(1_000_000),
  buyNowPrice: z.number().positive().max(1_000_000).optional().nullable(),
  durationHours: z.number().int().min(1).max(24 * 14),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  if (data.buyNowPrice && data.buyNowPrice <= data.startPrice) {
    return NextResponse.json({ error: "Buy-now price must be greater than starting price." }, { status: 400 });
  }

  const endsAt = new Date(Date.now() + data.durationHours * 60 * 60 * 1000);

  const listing = await prisma.listing.create({
    data: {
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      condition: data.condition,
      startPrice: data.startPrice,
      currentPrice: data.startPrice,
      buyNowPrice: data.buyNowPrice ?? null,
      endsAt,
      sellerId: session.user.id,
    },
  });

  return NextResponse.json({ listing });
}

export async function GET(req: Request) {
  await settleExpiredAuctions();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const minPrice = parseFloat(url.searchParams.get("minPrice") ?? "");
  const maxPrice = parseFloat(url.searchParams.get("maxPrice") ?? "");
  const condition = url.searchParams.get("condition")?.trim();
  const sort = url.searchParams.get("sort") ?? "ending";

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = { slug: category };
  if (condition) where.condition = condition;
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    const range: Record<string, number> = {};
    if (!Number.isNaN(minPrice)) range.gte = minPrice;
    if (!Number.isNaN(maxPrice)) range.lte = maxPrice;
    where.currentPrice = range;
  }

  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "priceAsc"
        ? { currentPrice: "asc" as const }
        : sort === "priceDesc"
          ? { currentPrice: "desc" as const }
          : { endsAt: "asc" as const };

  const listings = await prisma.listing.findMany({
    where,
    orderBy,
    take: 60,
    include: {
      category: true,
      _count: { select: { bids: true } },
    },
  });

  return NextResponse.json({ listings });
}
