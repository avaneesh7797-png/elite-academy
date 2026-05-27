import type { Metadata } from "next";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/marketplace-chrome";

export const metadata: Metadata = {
  title: "FitSpot — list your gym, yoga, or sports business",
  description:
    "Activities marketplace. ₹7,000 one-time. Get a customised website for your gym, yoga studio, sports club or any membership business.",
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50/40 via-white to-white">
      <MarketplaceHeader />
      <main className="flex-1">{children}</main>
      <MarketplaceFooter />
    </div>
  );
}
