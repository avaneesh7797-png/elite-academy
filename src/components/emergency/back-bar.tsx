"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackBar({ title, href = "/emergency" }: { title: string; href?: string }) {
  return (
    <header
      className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-red-900/40 bg-zinc-950/95 px-2 backdrop-blur"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "max(env(safe-area-inset-left), 0.5rem)",
        paddingRight: "max(env(safe-area-inset-right), 0.5rem)",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      <Link
        href={href}
        className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 hover:bg-zinc-800"
        aria-label="Back"
      >
        <ChevronLeft className="h-6 w-6" />
      </Link>
      <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
    </header>
  );
}
