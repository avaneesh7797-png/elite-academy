import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(280).optional(),
  priceInr: z.number().int().min(0).max(1_000_000).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
});

async function authorize(id: string, planId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Sign in required", status: 401 as const };
  const plan = await prisma.businessPlan.findUnique({
    where: { id: planId },
    include: { business: true },
  });
  if (!plan || plan.businessId !== id) return { error: "Not found", status: 404 as const };
  if (plan.business.ownerId !== session.user.id)
    return { error: "Forbidden", status: 403 as const };
  return { plan };
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; planId: string } }
) {
  const a = await authorize(params.id, params.planId);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  const plan = await prisma.businessPlan.update({
    where: { id: params.planId },
    data: parsed.data,
  });
  return NextResponse.json({ plan });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; planId: string } }
) {
  const a = await authorize(params.id, params.planId);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  await prisma.businessPlan.delete({ where: { id: params.planId } });
  return NextResponse.json({ ok: true });
}
