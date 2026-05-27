import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    include: {
      plans: { orderBy: { position: "asc" } },
      faqs: { orderBy: { position: "asc" } },
    },
  });
  if (!business || business.status !== "active")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ business });
}
