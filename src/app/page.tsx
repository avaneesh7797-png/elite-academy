import { Suspense } from "react";
import { Browse } from "@/components/browse";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={<div className="container py-12 text-muted-foreground">Loading...</div>}>
      <div>
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-background py-10">
          <div className="container">
            <h1 className="text-3xl font-bold sm:text-4xl">Bid. Win. Done.</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Discover deals and rare finds — or list your own item in minutes.
            </p>
          </div>
        </section>
        <Browse />
      </div>
    </Suspense>
  );
}
