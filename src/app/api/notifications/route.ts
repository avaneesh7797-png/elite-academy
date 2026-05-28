import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await settleExpiredAuctions();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notifications });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
