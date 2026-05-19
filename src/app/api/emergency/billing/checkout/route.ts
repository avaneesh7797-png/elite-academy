import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, getPayuConfig, makeRequestHash, newTxnId } from "@/lib/emergency/payu";

export const dynamic = "force-dynamic";

const schema = z.object({
  plan: z.enum(["monthly", "yearly"]),
  phone: z.string().min(7).max(20),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const cfg = getPayuConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Payments are not configured. Set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const plan = parsed.data.plan;
  const planConfig = PLANS[plan];
  const txnid = newTxnId();
  const amount = planConfig.amount.toFixed(2);

  await prisma.subscription.create({
    data: {
      userId,
      plan,
      status: "pending",
      payuTxnId: txnid,
      amount: planConfig.amount,
      currency: "INR",
    },
  });

  const origin = new URL(req.url).origin;
  const params = {
    key: cfg.key,
    txnid,
    amount,
    productinfo: planConfig.productinfo,
    firstname: user.name || user.email.split("@")[0],
    email: user.email,
    phone: parsed.data.phone,
    surl: `${origin}/api/emergency/billing/callback`,
    furl: `${origin}/api/emergency/billing/callback`,
  };
  const hash = makeRequestHash(cfg, params);

  return NextResponse.json({
    action: `${cfg.baseUrl}/_payment`,
    fields: { ...params, hash, service_provider: "payu_paisa" },
  });
}
