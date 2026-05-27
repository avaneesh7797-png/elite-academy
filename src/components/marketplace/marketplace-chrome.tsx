import Link from "next/link";
import { Dumbbell } from "lucide-react";

export function MarketplaceHeader() {
  return (
    <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-30">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/marketplace" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Dumbbell className="h-4 w-4" />
          </span>
          <span>FitSpot</span>
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            · activities marketplace
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/marketplace"
            className="hidden rounded-md px-3 py-1.5 hover:bg-muted sm:inline"
          >
            Browse
          </Link>
          <Link
            href="/marketplace/dashboard"
            className="rounded-md px-3 py-1.5 hover:bg-muted"
          >
            My listings
          </Link>
          <Link
            href="/marketplace/register"
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
          >
            List your business
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketplaceFooter() {
  return (
    <footer className="mt-16 border-t bg-white py-8 text-center text-sm text-muted-foreground">
      <div className="container">
        <p>
          FitSpot — list your gym, yoga studio, sports club or any membership business.
          ₹7,000 one-time. No monthly fees.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <Link href="/marketplace" className="hover:underline">
            Browse
          </Link>
          <Link href="/marketplace/register" className="hover:underline">
            List your business
          </Link>
          <Link href="/marketplace/dashboard" className="hover:underline">
            Owner login
          </Link>
        </div>
      </div>
    </footer>
  );
}
