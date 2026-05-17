import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const { userId: meId } = await getPremiumStatus();
  if (!meId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const myMembership = await prisma.familyMember.findFirst({
    where: { userId: meId },
    include: { family: true },
  });
  if (!myMembership) return NextResponse.json({ error: "No family circle." }, { status: 404 });
  if (myMembership.family.ownerId !== meId) {
    return NextResponse.json({ error: "Only the owner can remove members." }, { status: 403 });
  }
  if (params.userId === meId) {
    return NextResponse.json({ error: "Owners must delete the circle to leave." }, { status: 400 });
  }

  await prisma.familyMember.deleteMany({
    where: { familyId: myMembership.familyId, userId: params.userId },
  });
  await prisma.memberLocation.deleteMany({
    where: { familyId: myMembership.familyId, userId: params.userId },
  });

  return NextResponse.json({ ok: true });
}
