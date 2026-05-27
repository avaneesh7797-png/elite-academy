import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.string().min(2).max(40).optional(),
  tagline: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(60).optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  email: z.string().max(120).optional(),
  heroImage: z.string().max(500).optional(),
  gallery: z.array(z.string().max(500)).max(12).optional(),
  hours: z.record(z.string()).optional(),
  amenities: z.array(z.string().max(60)).max(40).optional(),
  themeColor: z.string().max(30).optional(),
  chatGreeting: z.string().max(300).optional(),
});

async function authorize(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Sign in required", status: 401 as const };
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) return { error: "Not found", status: 404 as const };
  if (business.ownerId !== session.user.id)
    return { error: "Forbidden", status: 403 as const };
  return { business, session };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(params.id);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const full = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      plans: { orderBy: { position: "asc" } },
      faqs: { orderBy: { position: "asc" } },
      applications: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  return NextResponse.json({ business: full });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(params.id);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const business = await prisma.business.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.category !== undefined && { category: d.category }),
      ...(d.tagline !== undefined && { tagline: d.tagline }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.address !== undefined && { address: d.address }),
      ...(d.city !== undefined && { city: d.city }),
      ...(d.phone !== undefined && { phone: d.phone }),
      ...(d.whatsapp !== undefined && { whatsapp: d.whatsapp }),
      ...(d.email !== undefined && { email: d.email }),
      ...(d.heroImage !== undefined && { heroImage: d.heroImage }),
      ...(d.gallery !== undefined && { gallery: JSON.stringify(d.gallery) }),
      ...(d.hours !== undefined && { hours: JSON.stringify(d.hours) }),
      ...(d.amenities !== undefined && { amenities: JSON.stringify(d.amenities) }),
      ...(d.themeColor !== undefined && { themeColor: d.themeColor }),
      ...(d.chatGreeting !== undefined && { chatGreeting: d.chatGreeting }),
    },
  });
  return NextResponse.json({ business });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(params.id);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  await prisma.business.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
