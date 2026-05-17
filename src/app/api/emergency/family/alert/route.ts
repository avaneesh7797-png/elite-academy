import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["sos", "check-in", "manual"]).default("sos"),
  message: z.string().max(280).default(""),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
});

export async function POST(req: Request) {
  const { userId, isPremium } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isPremium) return NextResponse.json({ error: "Premium required." }, { status: 402 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const membership = await prisma.familyMember.findFirst({ where: { userId } });
  if (!membership) return NextResponse.json({ error: "No family circle." }, { status: 404 });

  const alert = await prisma.familyAlert.create({
    data: {
      familyId: membership.familyId,
      userId,
      type: parsed.data.type,
      message: parsed.data.message,
      lat: parsed.data.lat ?? null,
      lon: parsed.data.lon ?? null,
    },
  });

  return NextResponse.json({ ok: true, alertId: alert.id });
}
