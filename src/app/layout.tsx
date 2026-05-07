import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "EliteBids — Buy & sell with live auctions",
  description: "Marketplace with live bidding, buy-it-now, and watchlists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            EliteBids · Built with Next.js, Prisma & Tailwind
          </footer>
        </Providers>
      </body>
    </html>
  );
}
