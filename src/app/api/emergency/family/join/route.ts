import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

const schema = z.object({ inviteCode: z.string().min(4).max(16) });

export async function POST(req: Request) {
  const { userId, isPremium } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isPremium) {
    return NextResponse.json(
      { error: "Family sharing is a Premium feature.", code: "premium_required" },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid invite code." }, { status: 400 });

  const code = parsed.data.inviteCode.trim().toUpperCase();
  const family = await prisma.family.findUnique({ where: { inviteCode: code } });
  if (!family) return NextResponse.json({ error: "Invite code not found." }, { status: 404 });

  const existing = await prisma.familyMember.findFirst({ where: { userId } });
  if (existing) {
    if (existing.familyId === family.id) {
      return NextResponse.json({ ok: true, familyId: family.id });
    }
    return NextResponse.json(
      { error: "Leave your current family circle before joining another." },
      { status: 409 }
    );
  }

  await prisma.familyMember.create({
    data: { familyId: family.id, userId, role: "member" },
  });

  return NextResponse.json({ ok: true, familyId: family.id });
}
