import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.string().min(2).max(40),
  city: z.string().min(2).max(60),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ businesses: [] });
  const businesses = await prisma.business.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: { where: { status: "new" } } } },
    },
  });
  return NextResponse.json({ businesses });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const slug = slugify(parsed.data.slug);
  const existing = await prisma.business.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "That link is taken — try another." }, { status: 409 });
  }
  const business = await prisma.business.create({
    data: {
      ownerId: session.user.id,
      slug,
      name: parsed.data.name,
      category: parsed.data.category,
      city: parsed.data.city,
      status: "pending",
    },
  });
  return NextResponse.json({ business });
}
