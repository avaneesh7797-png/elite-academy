import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPremiumStatus } from "@/lib/emergency/premium";
import { generateInviteCode } from "@/lib/emergency/family";

export const dynamic = "force-dynamic";

const STALE_LOCATION_MS = 15 * 60 * 1000;
const RECENT_ALERTS_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const { userId, isPremium } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isPremium) return NextResponse.json({ isPremium: false, family: null });

  const membership = await prisma.familyMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    include: {
      family: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: "asc" },
          },
          locations: true,
          alerts: {
            where: { createdAt: { gt: new Date(Date.now() - RECENT_ALERTS_MS) } },
            orderBy: { createdAt: "desc" },
            include: { user: { select: { id: true, name: true } } },
            take: 20,
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ isPremium, family: null });
  }

  const fam = membership.family;
  const locByUser = new Map(fam.locations.map((l) => [l.userId, l]));

  return NextResponse.json({
    isPremium,
    family: {
      id: fam.id,
      name: fam.name,
      inviteCode: fam.inviteCode,
      isOwner: fam.ownerId === userId,
      members: fam.members.map((m) => {
        const loc = locByUser.get(m.userId);
        const fresh = loc ? Date.now() - new Date(loc.updatedAt).getTime() < STALE_LOCATION_MS : false;
        return {
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          nickname: m.nickname,
          isMe: m.userId === userId,
          location: loc
            ? { lat: loc.lat, lon: loc.lon, accuracy: loc.accuracy, updatedAt: loc.updatedAt, fresh }
            : null,
        };
      }),
      alerts: fam.alerts.map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        lat: a.lat,
        lon: a.lon,
        createdAt: a.createdAt,
        acknowledgedAt: a.acknowledgedAt,
        from: { id: a.userId, name: a.user.name, isMe: a.userId === userId },
      })),
    },
  });
}

const createSchema = z.object({ name: z.string().min(1).max(80).default("My Circle") });

export async function POST(req: Request) {
  const { userId, isPremium } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isPremium) {
    return NextResponse.json(
      { error: "Family sharing is a Premium feature.", code: "premium_required" },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const family = await prisma.$transaction(async (tx) => {
      const existing = await tx.familyMember.findFirst({ where: { userId } });
      if (existing) throw new Error("ALREADY_IN_FAMILY");
      return tx.family.create({
        data: {
          name: parsed.data.name,
          ownerId: userId,
          inviteCode: generateInviteCode(),
          members: { create: { userId, role: "owner" } },
        },
      });
    });
    return NextResponse.json({ ok: true, familyId: family.id, inviteCode: family.inviteCode });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_IN_FAMILY") {
      return NextResponse.json({ error: "You're already in a family circle." }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE() {
  const { userId } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const membership = await prisma.familyMember.findFirst({
    where: { userId },
    include: { family: true },
  });
  if (!membership) return NextResponse.json({ ok: true });

  if (membership.family.ownerId === userId) {
    await prisma.family.delete({ where: { id: membership.familyId } });
  } else {
    await prisma.familyMember.delete({ where: { id: membership.id } });
    await prisma.memberLocation.deleteMany({
      where: { familyId: membership.familyId, userId },
    });
  }
  return NextResponse.json({ ok: true });
}
