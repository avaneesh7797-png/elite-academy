import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PublicBusinessPage } from "@/components/marketplace/public-business-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const b = await prisma.business.findUnique({
    where: { slug: params.slug },
    select: { name: true, tagline: true, description: true, heroImage: true, status: true },
  });
  if (!b || b.status !== "active") return { title: "Not found" };
  return {
    title: b.name,
    description: b.tagline || b.description?.slice(0, 160) || `${b.name} — book your membership.`,
    openGraph: {
      title: b.name,
      description: b.tagline,
      images: b.heroImage ? [b.heroImage] : undefined,
    },
  };
}

export default async function PublicGymRoute({ params }: { params: { slug: string } }) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    include: {
      plans: { orderBy: { position: "asc" } },
      faqs: { orderBy: { position: "asc" } },
    },
  });
  if (!business || business.status !== "active") notFound();

  return <PublicBusinessPage business={business} />;
}
