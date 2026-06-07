import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/studio/pwa-register";

export const metadata: Metadata = {
  title: "Studio — AI Image & Video Generator",
  description:
    "Personal AI studio: generate images, free in-browser motion videos, and audio from a prompt.",
  manifest: "/studio-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Studio",
  },
  icons: {
    icon: "/studio-icon.svg",
    apple: "/studio-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-zinc-950 text-zinc-100">
      <PwaRegister />
      {children}
    </div>
  );
}
