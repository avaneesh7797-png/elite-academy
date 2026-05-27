import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { RegisterForm } from "@/components/marketplace/register-form";
import { MARKETPLACE_LISTING_FEE_INR } from "@/lib/marketplace/payu-link";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/marketplace/register");
  }
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/marketplace"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to marketplace
        </Link>
        <h1 className="mt-4 text-3xl font-bold">List your business</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us the basics. After paying the one-time ₹
          {MARKETPLACE_LISTING_FEE_INR.toLocaleString("en-IN")} listing fee, you'll be able
          to fully customise your page.
        </p>
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
