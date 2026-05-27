import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  payuTxnId: z.string().min(4).max(120),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a valid PayU Transaction ID" }, { status: 400 });

  const business = await prisma.business.findUnique({ where: { id: params.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (business.ownerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const txn = parsed.data.payuTxnId.trim();
  const dupe = await prisma.business.findFirst({
    where: { payuTxnId: txn, NOT: { id: business.id } },
  });
  if (dupe)
    return NextResponse.json(
      { error: "That Transaction ID is already used for another listing." },
      { status: 409 }
    );

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: {
      payuTxnId: txn,
      paidAt: new Date(),
      // Owner-submitted — flag as active immediately so the page goes live.
      // Admin can suspend later if PayU dashboard doesn't match.
      status: "active",
    },
  });
  return NextResponse.json({ business: updated });
}
