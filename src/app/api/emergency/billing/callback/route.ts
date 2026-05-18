import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLANS, getPayuConfig, verifyResponseHash } from "@/lib/emergency/payu";
import { PAYU_PAYMENT_PERIOD_DAYS } from "@/lib/emergency/payu-link";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cfg = getPayuConfig();
  if (!cfg) {
    return NextResponse.redirect(new URL("/emergency/upgrade?status=misconfigured", req.url), 303);
  }

  const form = await req.formData();
  const body: Record<string, string> = {};
  form.forEach((v, k) => {
    body[k] = typeof v === "string" ? v : "";
  });

  const valid = verifyResponseHash(cfg, body);
  if (!valid) {
    return NextResponse.redirect(new URL("/emergency/upgrade?status=invalid", req.url), 303);
  }

  const txnid = body.txnid;
  const status = body.status;
  const mihpayid = body.mihpayid || body.payuMoneyId || "";

  const sub = await prisma.subscription.findUnique({ where: { payuTxnId: txnid } });
  if (!sub) {
    return NextResponse.redirect(new URL("/emergency/upgrade?status=unknown", req.url), 303);
  }

  if (status === "success") {
    const planConfig = PLANS[sub.plan as keyof typeof PLANS];
    const periodDays = planConfig?.periodDays ?? PAYU_PAYMENT_PERIOD_DAYS;
    const start = new Date();
    const end = new Date(start.getTime() + periodDays * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        payuPaymentId: mihpayid || null,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      },
    });
    return NextResponse.redirect(new URL("/emergency/upgrade?status=success", req.url), 303);
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: status === "failure" ? "failed" : "cancelled",
      payuPaymentId: mihpayid || null,
    },
  });
  return NextResponse.redirect(new URL(`/emergency/upgrade?status=${status || "failed"}`, req.url), 303);
}

export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/emergency/upgrade", req.url), 303);
}
