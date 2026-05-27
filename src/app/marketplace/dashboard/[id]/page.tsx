import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardEditor } from "@/components/marketplace/dashboard-editor";

export const dynamic = "force-dynamic";

export default async function ManageBusinessPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/marketplace/dashboard/${params.id}`);

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      plans: { orderBy: { position: "asc" } },
      faqs: { orderBy: { position: "asc" } },
      applications: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!business) notFound();
  if (business.ownerId !== session.user.id) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-xl font-semibold">You don&apos;t have access to this business.</h1>
        <Link
          href="/marketplace/dashboard"
          className="mt-4 inline-block text-sm text-emerald-700 hover:underline"
        >
          Back to your dashboard
        </Link>
      </div>
    );
  }

  return <DashboardEditor initialBusiness={business} />;
}
