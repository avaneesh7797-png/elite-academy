import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("slug") || "";
  const slug = slugify(raw);
  if (slug.length < 3)
    return NextResponse.json({ slug, available: false, reason: "Too short" });
  const existing = await prisma.business.findUnique({ where: { slug } });
  return NextResponse.json({ slug, available: !existing });
}
