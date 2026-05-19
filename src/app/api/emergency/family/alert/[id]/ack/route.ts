import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const alert = await prisma.familyAlert.findUnique({ where: { id: params.id } });
  if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });

  const membership = await prisma.familyMember.findUnique({
    where: { familyId_userId: { familyId: alert.familyId, userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not in this family." }, { status: 403 });

  await prisma.familyAlert.update({
    where: { id: params.id },
    data: { acknowledgedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
