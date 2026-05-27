import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(30).optional().default(""),
  message: z.string().max(500).optional().default(""),
  planId: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    select: { id: true, status: true },
  });
  if (!business || business.status !== "active")
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const session = await getServerSession(authOptions);
  const planId = parsed.data.planId || null;
  if (planId) {
    const plan = await prisma.businessPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.businessId !== business.id) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
  }
  const application = await prisma.membershipApplication.create({
    data: {
      businessId: business.id,
      planId,
      userId: session?.user?.id ?? null,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      message: parsed.data.message,
    },
  });
  return NextResponse.json({ ok: true, applicationId: application.id });
}
