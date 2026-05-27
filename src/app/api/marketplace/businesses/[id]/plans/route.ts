import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(280).optional().default(""),
  priceInr: z.number().int().min(0).max(1_000_000),
  durationDays: z.number().int().min(1).max(3650).default(30),
});

async function authorize(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Sign in required", status: 401 as const };
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) return { error: "Not found", status: 404 as const };
  if (business.ownerId !== session.user.id) return { error: "Forbidden", status: 403 as const };
  return { business };
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(params.id);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid plan" },
      { status: 400 }
    );
  const count = await prisma.businessPlan.count({ where: { businessId: params.id } });
  const plan = await prisma.businessPlan.create({
    data: { ...parsed.data, businessId: params.id, position: count },
  });
  return NextResponse.json({ plan });
}
