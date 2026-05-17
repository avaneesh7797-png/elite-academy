"use client";

import { useEffect, useState } from "react";
import { BackBar } from "@/components/emergency/back-bar";
import {
  DEFAULT_SETTINGS,
  EmergencySettings,
  loadSettings,
  saveSettings,
} from "@/lib/emergency/storage";

const PRESETS: { label: string; country: string; medical: string; fire: string; police: string }[] = [
  { label: "United States / Canada", country: "US", medical: "911", fire: "911", police: "911" },
  { label: "European Union", country: "EU", medical: "112", fire: "112", police: "112" },
  { label: "United Kingdom", country: "GB", medical: "999", fire: "999", police: "999" },
  { label: "India", country: "IN", medical: "102", fire: "101", police: "100" },
  { label: "Australia", country: "AU", medical: "000", fire: "000", police: "000" },
  { label: "Japan", country: "JP", medical: "119", fire: "119", police: "110" },
];

export default function SettingsPage() {
  const [s, setS] = useState<EmergencySettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setS(loadSettings());
  }, []);

  const update = <K extends keyof EmergencySettings>(key: K, value: EmergencySettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setS((prev) => ({
      ...prev,
      country: p.country,
      medicalNumber: p.medical,
      fireNumber: p.fire,
      policeNumber: p.police,
    }));
    setSaved(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <BackBar title="Settings" />
      <form onSubmit={onSubmit} className="space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Country preset
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.country}
                type="button"
                onClick={() => applyPreset(p)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                  s.country === p.country
                    ? "border-red-500 bg-red-600/10 text-red-200"
                    : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <span>{p.label}</span>
                <span className="text-xs text-zinc-400">
                  M {p.medical} · F {p.fire} · P {p.police}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Numbers to dial
          </h2>
          <div className="space-y-3">
            <NumField
              label="Medical"
              value={s.medicalNumber}
              onChange={(v) => update("medicalNumber", v)}
            />
            <NumField
              label="Fire / accident"
              value={s.fireNumber}
              onChange={(v) => update("fireNumber", v)}
            />
            <NumField
              label="Police"
              value={s.policeNumber}
              onChange={(v) => update("policeNumber", v)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Location
          </h2>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="block">Share location during SOS</span>
              <span className="block text-xs text-zinc-400">
                Used to create a maps link you can text to your contact.
              </span>
            </span>
            <input
              type="checkbox"
              checked={s.shareLocation}
              onChange={(e) => update("shareLocation", e.target.checked)}
              className="h-5 w-5 accent-red-600"
            />
          </label>
        </section>

        <button
          type="submit"
          className="sticky bottom-3 z-10 w-full rounded-xl bg-red-600 py-3 font-semibold text-white shadow-lg active:bg-red-500"
        >
          {saved ? "Saved ✓" : "Save settings"}
        </button>
      </form>
    </>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-zinc-100 focus:border-red-500 focus:outline-none"
      />
    </label>
  );
}
