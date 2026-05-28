import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const existing = await prisma.watch.findUnique({
    where: { userId_listingId: { userId, listingId: params.id } },
  });
  if (existing) {
    await prisma.watch.delete({ where: { id: existing.id } });
    return NextResponse.json({ watching: false });
  }
  await prisma.watch.create({ data: { userId, listingId: params.id } });
  return NextResponse.json({ watching: true });
}
