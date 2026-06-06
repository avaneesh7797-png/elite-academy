import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Studio — Image & Video Generator",
  description: "Personal AI studio for generating images and video from text prompts.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh w-full bg-zinc-950 text-zinc-100">{children}</div>;
}
