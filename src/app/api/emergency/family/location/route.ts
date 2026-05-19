import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).nullable().optional(),
});

export async function POST(req: Request) {
  const { userId, isPremium } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isPremium) return NextResponse.json({ error: "Premium required." }, { status: 402 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });

  const membership = await prisma.familyMember.findFirst({ where: { userId } });
  if (!membership) return NextResponse.json({ error: "No family circle." }, { status: 404 });

  await prisma.memberLocation.upsert({
    where: { familyId_userId: { familyId: membership.familyId, userId } },
    create: {
      familyId: membership.familyId,
      userId,
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      accuracy: parsed.data.accuracy ?? null,
    },
    update: {
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      accuracy: parsed.data.accuracy ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { userId } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const membership = await prisma.familyMember.findFirst({ where: { userId } });
  if (!membership) return NextResponse.json({ ok: true });

  await prisma.memberLocation.deleteMany({
    where: { familyId: membership.familyId, userId },
  });
  return NextResponse.json({ ok: true });
}
