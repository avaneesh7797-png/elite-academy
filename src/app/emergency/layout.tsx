import type { Metadata, Viewport } from "next";
import { SwRegister } from "@/components/emergency/sw-register";

export const metadata: Metadata = {
  title: "Emergency",
  description: "One-tap help — SOS, Medical ID, first aid guides, trusted contacts.",
  manifest: "/emergency-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Emergency",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function EmergencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-zinc-100">
      <SwRegister />
      <div className="mx-auto max-w-md min-h-full pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        {children}
      </div>
    </div>
  );
}
