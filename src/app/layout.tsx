import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "EliteBids — Buy & sell with live auctions",
  description: "Marketplace with live bidding, buy-it-now, and watchlists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
