import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { themeClasses } from "@/lib/marketplace/types";
import { MARKETPLACE_LISTING_FEE_INR } from "@/lib/marketplace/payu-link";
import { BrowseFilters } from "@/components/marketplace/browse-filters";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; category?: string; city?: string };

export default async function MarketplaceHome({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const where: Prisma.BusinessWhereInput = { status: "active" };
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.city)
    where.city = { contains: searchParams.city, mode: "insensitive" };
  if (searchParams.q) {
    where.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { tagline: { contains: searchParams.q, mode: "insensitive" } },
      { description: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }
  const businesses = await prisma.business.findMany({
    where,
    orderBy: { paidAt: "desc" },
    take: 60,
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      city: true,
      tagline: true,
      heroImage: true,
      themeColor: true,
    },
  });

  return (
    <div>
      <section className="border-b bg-gradient-to-br from-emerald-100/60 via-white to-teal-50/40">
        <div className="container py-12 md:py-20">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-800">
              For gym, yoga, sports & every membership business
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Run a gym, studio, or club? Get your own website in 5 minutes.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              ₹{MARKETPLACE_LISTING_FEE_INR.toLocaleString("en-IN")} one-time. No monthly fees.
              We list you on the marketplace, give you a customised page, and let your members
              sign up directly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/marketplace/register"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
              >
                List your business
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#browse"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/30 bg-white px-5 py-3 font-medium text-emerald-800 hover:bg-emerald-50"
              >
                <Search className="h-4 w-4" />
                Find a place to train
              </a>
            </div>
            <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {[
                "Own page at yoursite.com/g/your-name",
                "Take member sign-ups directly",
                "Built-in chatbot for your business",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="browse" className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Discover places near you</h2>
            <p className="text-sm text-muted-foreground">
              Gyms, yoga studios, sports clubs and more — all in one place.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <BrowseFilters
            initial={{
              q: searchParams.q || "",
              category: searchParams.category || "",
              city: searchParams.city || "",
            }}
          />
        </div>

        {businesses.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed bg-white p-10 text-center text-muted-foreground">
            <p>No listings match — try clearing filters, or be the first to list.</p>
            <Link
              href="/marketplace/register"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              List your business
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => {
              const tc = themeClasses(b.themeColor);
              return (
                <Link
                  key={b.id}
                  href={`/g/${b.slug}`}
                  className="group overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
                >
                  <div
                    className={`relative aspect-[16/10] w-full overflow-hidden ${tc.bg}`}
                    style={
                      b.heroImage
                        ? {
                            backgroundImage: `url(${b.heroImage})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {!b.heroImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-5xl font-bold ${tc.text}`}>
                          {b.name.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span
                      className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ${tc.chip}`}
                    >
                      {b.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:underline">{b.name}</h3>
                    {b.tagline && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {b.tagline}
                      </p>
                    )}
                    {b.city && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {b.city}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t bg-white py-14">
        <div className="container">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Sign up & pay ₹7,000",
                body: "One-time fee via PayU. No monthly billing — your listing stays live.",
              },
              {
                step: "2",
                title: "Customise your page",
                body: "Add photos, plans, hours, FAQs. Pick your theme. Goes live instantly.",
              },
              {
                step: "3",
                title: "Take members",
                body: "Visitors apply right from your page. You manage everything from your dashboard.",
              },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border bg-emerald-50/40 p-6">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
