import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Eye, Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace/dashboard");

  const businesses = await prisma.business.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: { where: { status: "new" } } } },
    },
  });

  return (
    <div className="container py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My listings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your activity businesses.
          </p>
        </div>
        <Link
          href="/marketplace/register"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> New listing
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No listings yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get your business online in 5 minutes. ₹7,000 one-time.
          </p>
          <Link
            href="/marketplace/register"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            List your business <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {businesses.map((b) => (
            <div key={b.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{b.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    /g/{b.slug} · {b.category}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    b.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : b.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {b.status === "pending" ? "Awaiting payment" : b.status}
                </span>
              </div>

              {b._count.applications > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  <Bell className="h-3 w-3" />
                  {b._count.applications} new {b._count.applications === 1 ? "lead" : "leads"}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/marketplace/dashboard/${b.id}`}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Manage
                </Link>
                {b.status === "active" && (
                  <Link
                    href={`/g/${b.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Eye className="h-3 w-3" /> View page
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
