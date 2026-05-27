import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(3).max(200).optional(),
  answer: z.string().min(2).max(1000).optional(),
});

async function authorize(id: string, faqId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Sign in required", status: 401 as const };
  const faq = await prisma.businessFAQ.findUnique({
    where: { id: faqId },
    include: { business: true },
  });
  if (!faq || faq.businessId !== id) return { error: "Not found", status: 404 as const };
  if (faq.business.ownerId !== session.user.id)
    return { error: "Forbidden", status: 403 as const };
  return { faq };
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; faqId: string } }
) {
  const a = await authorize(params.id, params.faqId);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid Q&A" }, { status: 400 });
  const faq = await prisma.businessFAQ.update({
    where: { id: params.faqId },
    data: parsed.data,
  });
  return NextResponse.json({ faq });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; faqId: string } }
) {
  const a = await authorize(params.id, params.faqId);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  await prisma.businessFAQ.delete({ where: { id: params.faqId } });
  return NextResponse.json({ ok: true });
}
