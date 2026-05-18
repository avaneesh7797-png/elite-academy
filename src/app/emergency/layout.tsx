import type { Metadata, Viewport } from "next";
import { SwRegister } from "@/components/emergency/sw-register";

export const metadata: Metadata = {
  title: "Emergency",
  description: "One-tap help — SOS, Medical ID, first aid guides, trusted contacts.",
  manifest: "/emergency-manifest.webmanifest",
  icons: {
    icon: [
      { url: "/emergency-icon.svg", type: "image/svg+xml" },
      { url: "/emergency-icon/192", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/emergency-icon/180", sizes: "180x180" },
      { url: "/emergency-icon/167", sizes: "167x167" },
      { url: "/emergency-icon/152", sizes: "152x152" },
      { url: "/emergency-icon/120", sizes: "120x120" },
    ],
  },
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
  viewportFit: "cover",
};

export default function EmergencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="emergency-shell min-h-dvh w-full bg-zinc-950 text-zinc-100">
      <SwRegister />
      <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  );
}
