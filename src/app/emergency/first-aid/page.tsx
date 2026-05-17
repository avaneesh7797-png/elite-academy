import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { FIRST_AID_GUIDES } from "@/lib/emergency/first-aid";

const CATEGORY_LABEL: Record<string, string> = {
  cardiac: "Cardiac & stroke",
  trauma: "Bleeding & trauma",
  fire: "Fire & smoke",
  other: "Other emergencies",
};

const ORDER = ["cardiac", "trauma", "fire", "other"] as const;

export default function FirstAidPage() {
  const grouped = ORDER.map((cat) => ({
    cat,
    items: FIRST_AID_GUIDES.filter((g) => g.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <BackBar title="First Aid" />
      <div className="px-4 py-5">
        <p className="mb-4 text-xs text-zinc-400">
          General first aid steps. These work offline. Always call emergency services for any serious situation.
        </p>
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.cat}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {CATEGORY_LABEL[group.cat]}
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                {group.items.map((g, i) => (
                  <li key={g.slug}>
                    <Link
                      href={`/emergency/first-aid/${g.slug}`}
                      className={`flex items-center gap-3 px-4 py-3 active:bg-zinc-800 ${
                        i > 0 ? "border-t border-zinc-800" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-zinc-100">{g.title}</div>
                        <div className="mt-0.5 text-xs text-zinc-400">{g.summary}</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
