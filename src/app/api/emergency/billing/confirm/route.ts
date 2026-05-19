import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PAYU_PAYMENT_AMOUNT, PAYU_PAYMENT_LABEL } from "@/lib/emergency/payu-link";

export const dynamic = "force-dynamic";

const schema = z.object({
  txnid: z.string().min(4).max(80),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your PayU Transaction ID." }, { status: 400 });
  }
  const txnid = parsed.data.txnid.trim();

  const existing = await prisma.subscription.findUnique({ where: { payuTxnId: txnid } });
  if (existing) {
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "That Transaction ID is already linked to another account." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: existing.status });
  }

  const sub = await prisma.subscription.create({
    data: {
      userId,
      plan: PAYU_PAYMENT_LABEL,
      status: "awaiting_verification",
      payuTxnId: txnid,
      amount: Number(PAYU_PAYMENT_AMOUNT) || 0,
      currency: "INR",
    },
  });

  return NextResponse.json({ ok: true, status: sub.status });
}
