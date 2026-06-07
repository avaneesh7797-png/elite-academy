"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isEmergency = path?.startsWith("/emergency") ?? false;
  const isMarketplace = path?.startsWith("/marketplace") ?? false;
  const isPublicGym = path?.startsWith("/g/") ?? false;
  const isStudio = path?.startsWith("/studio") ?? false;

  if (isEmergency || isMarketplace || isPublicGym || isStudio) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        EliteBids · Built with Next.js, Prisma &amp; Tailwind
      </footer>
    </>
  );
}
