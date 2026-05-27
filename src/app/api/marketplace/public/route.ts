import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const category = url.searchParams.get("category")?.trim() || "";
  const city = url.searchParams.get("city")?.trim() || "";

  const where: Prisma.BusinessWhereInput = { status: "active" };
  if (category) where.category = category;
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { tagline: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const businesses = await prisma.business.findMany({
    where,
    orderBy: { paidAt: "desc" },
    take: 60,
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      city: true,
      tagline: true,
      heroImage: true,
      themeColor: true,
    },
  });
  return NextResponse.json({ businesses });
}
