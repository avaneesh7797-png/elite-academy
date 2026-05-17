"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Crosshair, HeartPulse, Hospital, Loader2, MapPin, Phone, Pill, Stethoscope, Zap } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";

type Place = {
  id: string;
  kind: "hospital" | "clinic" | "pharmacy" | "aed";
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  phone?: string;
};

const KIND_META: Record<Place["kind"], { label: string; icon: React.ReactNode; color: string }> = {
  hospital: { label: "Hospital", icon: <Hospital className="h-4 w-4" />, color: "bg-red-600/20 text-red-300" },
  clinic: { label: "Clinic", icon: <Stethoscope className="h-4 w-4" />, color: "bg-orange-600/20 text-orange-300" },
  pharmacy: { label: "Pharmacy", icon: <Pill className="h-4 w-4" />, color: "bg-emerald-600/20 text-emerald-300" },
  aed: { label: "AED", icon: <Zap className="h-4 w-4" />, color: "bg-amber-500/20 text-amber-300" },
};

function formatDistance(m: number) {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function NearbyPage() {
  const { status, loading: statusLoading } = useEmergencyStatus();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | Place["kind"]>("all");

  const locate = useCallback(() => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Location is not available on this device.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        setBusy(false);
        setError(err.message || "Could not get location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    if (status.isPremium && !coords) locate();
  }, [status.isPremium, coords, locate]);

  useEffect(() => {
    if (!coords) return;
    let aborted = false;
    setBusy(true);
    fetch(`/api/emergency/nearby?lat=${coords.lat}&lon=${coords.lon}&radius=3000`)
      .then(async (r) => {
        const data = await r.json();
        if (aborted) return;
        if (!r.ok) {
          setError(data.error || "Search failed.");
          setPlaces([]);
        } else {
          setPlaces(data.places || []);
          setError(null);
        }
      })
      .catch(() => {
        if (!aborted) setError("Network error.");
      })
      .finally(() => {
        if (!aborted) setBusy(false);
      });
    return () => {
      aborted = true;
    };
  }, [coords]);

  if (!statusLoading && !status.isPremium) {
    return (
      <>
        <BackBar title="Nearby Help" />
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <HeartPulse className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Premium feature</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-400">
            Find the closest hospitals, clinics, pharmacies and public defibrillators around you.
          </p>
          <Link
            href="/emergency/upgrade"
            className="mt-5 inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950"
          >
            Unlock Premium
          </Link>
        </div>
      </>
    );
  }

  const visible = (places ?? []).filter((p) => filter === "all" || p.kind === filter);

  return (
    <>
      <BackBar title="Nearby Help" />
      <div className="px-4 py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-zinc-400">
            {coords
              ? `Around ${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)} · 3 km radius`
              : "Getting your location…"}
          </div>
          <button
            onClick={locate}
            className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            <Crosshair className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "hospital", "clinic", "pharmacy", "aed"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 text-xs ${
                filter === k ? "bg-amber-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {k === "all" ? "All" : KIND_META[k].label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {busy && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        )}

        {!busy && places && visible.length === 0 && (
          <div className="mt-8 text-center text-sm text-zinc-500">
            Nothing found within 3 km. Try refreshing or widening the filter.
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {visible.map((p) => {
            const meta = KIND_META[p.kind];
            const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
            return (
              <li
                key={p.id}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
              >
                <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-zinc-400">
                    {meta.label} · {formatDistance(p.distanceM)}
                  </div>
                </div>
                {p.phone && (
                  <a
                    href={`tel:${p.phone.replace(/\s+/g, "")}`}
                    aria-label="Call"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                <a
                  href={dirUrl}
                  target="_blank"
                  rel="noopener"
                  aria-label="Directions"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white"
                >
                  <MapPin className="h-4 w-4" />
                </a>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-500">
          Data from OpenStreetMap contributors. Coverage varies by region.
        </p>
      </div>
    </>
  );
}
