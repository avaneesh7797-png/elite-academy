import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PremiumStatus = {
  userId: string | null;
  isPremium: boolean;
  currentPeriodEnd: Date | null;
  plan: string | null;
};

export async function getPremiumStatus(): Promise<PremiumStatus> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return { userId: null, isPremium: false, currentPeriodEnd: null, plan: null };
  }
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "active",
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
  });
  return {
    userId,
    isPremium: Boolean(sub),
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    plan: sub?.plan ?? null,
  };
}

export async function requireUser(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
