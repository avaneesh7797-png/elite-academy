import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { FIRST_AID_GUIDES, getGuide } from "@/lib/emergency/first-aid";

export function generateStaticParams() {
  return FIRST_AID_GUIDES.map((g) => ({ topic: g.slug }));
}

export default function GuidePage({ params }: { params: { topic: string } }) {
  const guide = getGuide(params.topic);
  if (!guide) notFound();

  return (
    <>
      <BackBar title={guide.title} href="/emergency/first-aid" />
      <article className="space-y-4 px-4 py-5">
        <header>
          <h1 className="text-2xl font-bold leading-tight">{guide.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{guide.summary}</p>
        </header>

        {guide.warning && (
          <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <span>{guide.warning}</span>
          </div>
        )}

        <ol className="space-y-3">
          {guide.steps.map((step, i) => (
            <li
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="text-sm font-semibold text-zinc-100">{step.heading}</div>
              <div className="mt-1 text-sm leading-relaxed text-zinc-300">{step.body}</div>
            </li>
          ))}
        </ol>

        <a
          href="/emergency/sos"
          className="mt-6 block rounded-xl bg-red-600 py-3 text-center font-semibold text-white active:bg-red-500"
        >
          Open SOS
        </a>
      </article>
    </>
  );
}
