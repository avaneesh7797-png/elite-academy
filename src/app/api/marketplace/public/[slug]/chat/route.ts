import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { answerQuery } from "@/lib/marketplace/chatbot";

export const dynamic = "force-dynamic";

const schema = z.object({ message: z.string().min(1).max(500) });

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    include: {
      plans: { orderBy: { position: "asc" } },
      faqs: { orderBy: { position: "asc" } },
    },
  });
  if (!business || business.status !== "active")
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reply = answerQuery(parsed.data.message, {
    name: business.name,
    category: business.category,
    tagline: business.tagline,
    description: business.description,
    address: business.address,
    city: business.city,
    phone: business.phone,
    whatsapp: business.whatsapp,
    email: business.email,
    hours: business.hours,
    amenities: business.amenities,
    chatGreeting: business.chatGreeting,
    plans: business.plans.map((p) => ({
      name: p.name,
      description: p.description,
      priceInr: p.priceInr,
      durationDays: p.durationDays,
    })),
    faqs: business.faqs.map((f) => ({ question: f.question, answer: f.answer })),
  });
  return NextResponse.json({ reply });
}
