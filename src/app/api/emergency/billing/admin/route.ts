import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAYU_PAYMENT_PERIOD_DAYS } from "@/lib/emergency/payu-link";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!email || !adminEmail || email !== adminEmail) return null;
  return email;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const pending = await prisma.subscription.findMany({
    where: { status: "awaiting_verification" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
    take: 100,
  });
  return NextResponse.json({
    pending: pending.map((s) => ({
      id: s.id,
      plan: s.plan,
      amount: s.amount,
      currency: s.currency,
      payuTxnId: s.payuTxnId,
      createdAt: s.createdAt,
      user: s.user,
    })),
  });
}

const actionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["activate", "reject"]),
  payuPaymentId: z.string().max(80).optional(),
  periodDays: z.number().int().positive().max(3650).optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({ where: { id: parsed.data.id } });
  if (!sub) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });

  if (parsed.data.action === "activate") {
    const days = parsed.data.periodDays ?? PAYU_PAYMENT_PERIOD_DAYS;
    const start = new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        payuPaymentId: parsed.data.payuPaymentId ?? sub.payuPaymentId,
      },
    });
  } else {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "rejected" },
    });
  }
  return NextResponse.json({ ok: true });
}
