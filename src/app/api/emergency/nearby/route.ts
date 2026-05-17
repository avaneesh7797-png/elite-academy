import { NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

type Place = {
  id: string;
  kind: "hospital" | "clinic" | "pharmacy" | "aed";
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  phone?: string;
};

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: Request) {
  const { isPremium } = await getPremiumStatus();
  if (!isPremium) {
    return NextResponse.json(
      { error: "Premium required.", code: "premium_required" },
      { status: 402 }
    );
  }

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const radius = Math.min(Math.max(Number(url.searchParams.get("radius") ?? 3000), 500), 10000);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  const query = `
    [out:json][timeout:25];
    (
      node(around:${radius},${lat},${lon})[amenity=hospital];
      way(around:${radius},${lat},${lon})[amenity=hospital];
      node(around:${radius},${lat},${lon})[amenity=clinic];
      node(around:${radius},${lat},${lon})[amenity=pharmacy];
      node(around:${radius},${lat},${lon})[emergency=defibrillator];
    );
    out center tags 60;
  `.trim();

  try {
    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 60 },
    });
    if (!r.ok) {
      return NextResponse.json({ error: "Upstream error", status: r.status }, { status: 502 });
    }
    const data = (await r.json()) as {
      elements: Array<{
        id: number;
        type: string;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const places: Place[] = [];
    for (const el of data.elements ?? []) {
      const eLat = el.lat ?? el.center?.lat;
      const eLon = el.lon ?? el.center?.lon;
      if (eLat == null || eLon == null) continue;
      const tags = el.tags ?? {};
      let kind: Place["kind"] | null = null;
      if (tags.emergency === "defibrillator") kind = "aed";
      else if (tags.amenity === "hospital") kind = "hospital";
      else if (tags.amenity === "clinic") kind = "clinic";
      else if (tags.amenity === "pharmacy") kind = "pharmacy";
      if (!kind) continue;
      places.push({
        id: `${el.type}/${el.id}`,
        kind,
        name: tags.name || tags["name:en"] || (kind === "aed" ? "Public defibrillator" : "Unnamed"),
        lat: eLat,
        lon: eLon,
        distanceM: Math.round(haversineM(lat, lon, eLat, eLon)),
        phone: tags["contact:phone"] || tags.phone || undefined,
      });
    }
    places.sort((a, b) => a.distanceM - b.distanceM);
    return NextResponse.json({ places: places.slice(0, 40) });
  } catch (e) {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }
}
