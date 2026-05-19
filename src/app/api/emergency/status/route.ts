import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const { isPremium, currentPeriodEnd, plan } = await getPremiumStatus();
  return NextResponse.json({
    user: session?.user
      ? { id: session.user.id, name: session.user.name, email: session.user.email }
      : null,
    isPremium,
    currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
    plan,
    payuConfigured: Boolean(process.env.PAYU_MERCHANT_KEY && process.env.PAYU_MERCHANT_SALT),
  });
}
