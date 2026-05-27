export const BUSINESS_CATEGORIES = [
  "Gym",
  "Yoga Studio",
  "CrossFit Box",
  "Martial Arts",
  "Dance Studio",
  "Sports Club",
  "Swimming",
  "Personal Training",
  "Pilates",
  "Co-working",
  "Other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const THEME_COLORS = [
  { id: "emerald", name: "Emerald", hex: "#10b981" },
  { id: "rose", name: "Rose", hex: "#f43f5e" },
  { id: "blue", name: "Blue", hex: "#3b82f6" },
  { id: "violet", name: "Violet", hex: "#8b5cf6" },
  { id: "amber", name: "Amber", hex: "#f59e0b" },
  { id: "slate", name: "Slate", hex: "#64748b" },
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number]["id"];

export function themeClasses(theme: string) {
  const map: Record<string, { bg: string; ring: string; text: string; btn: string; chip: string }> = {
    emerald: {
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      text: "text-emerald-700",
      btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
      chip: "bg-emerald-100 text-emerald-800",
    },
    rose: {
      bg: "bg-rose-50",
      ring: "ring-rose-200",
      text: "text-rose-700",
      btn: "bg-rose-600 hover:bg-rose-700 text-white",
      chip: "bg-rose-100 text-rose-800",
    },
    blue: {
      bg: "bg-blue-50",
      ring: "ring-blue-200",
      text: "text-blue-700",
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
      chip: "bg-blue-100 text-blue-800",
    },
    violet: {
      bg: "bg-violet-50",
      ring: "ring-violet-200",
      text: "text-violet-700",
      btn: "bg-violet-600 hover:bg-violet-700 text-white",
      chip: "bg-violet-100 text-violet-800",
    },
    amber: {
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      text: "text-amber-700",
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
      chip: "bg-amber-100 text-amber-800",
    },
    slate: {
      bg: "bg-slate-50",
      ring: "ring-slate-200",
      text: "text-slate-700",
      btn: "bg-slate-700 hover:bg-slate-800 text-white",
      chip: "bg-slate-200 text-slate-800",
    },
  };
  return map[theme] || map.emerald;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function parseJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
