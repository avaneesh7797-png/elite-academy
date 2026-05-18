"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Phone } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { SosHoldButton } from "@/components/emergency/sos-hold-button";
import {
  DEFAULT_SETTINGS,
  EmergencySettings,
  EmergencyType,
  TrustedContact,
  labelFor,
  loadContacts,
  loadSettings,
  numberFor,
} from "@/lib/emergency/storage";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";

type Location = { lat: number; lon: number; accuracy: number };

export default function SosPage() {
  const [ready, setReady] = useState(false);
  const [type, setType] = useState<EmergencyType | null>(null);
  const [activated, setActivated] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [settings, setSettings] = useState<EmergencySettings>(DEFAULT_SETTINGS);
  const { status } = useEmergencyStatus();

  const alertSentNoLocRef = useRef(false);
  const alertSentWithLocRef = useRef(false);

  useEffect(() => {
    setContacts(loadContacts());
    setSettings(loadSettings());
    setReady(true);
  }, []);

  const fetchLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Location not available on this device");
      return;
    }
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => setLocError(err.message || "Could not get location"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    if (!activated || !settings.shareLocation) return;
    fetchLocation();
  }, [activated, settings.shareLocation, fetchLocation]);

  useEffect(() => {
    if (!activated || !type) return;
    if (!status.isPremium) return;
    if (alertSentWithLocRef.current) return;

    if (location) {
      alertSentWithLocRef.current = true;
      fetch("/api/emergency/family/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sos",
          message: labelFor(type),
          lat: location.lat,
          lon: location.lon,
        }),
      }).catch(() => {});
      return;
    }

    if (alertSentNoLocRef.current) return;
    const t = setTimeout(() => {
      if (location) return;
      alertSentNoLocRef.current = true;
      fetch("/api/emergency/family/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sos", message: labelFor(type) }),
      }).catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [activated, type, location, status.isPremium]);

  const dial = (number: string) => {
    window.location.href = `tel:${number.replace(/\s+/g, "")}`;
  };

  const onActivate = (t: EmergencyType) => {
    if (!ready) return;
    setType(t);
    setActivated(true);
    dial(numberFor(t, settings));
  };

  const reset = () => {
    setActivated(false);
    setType(null);
    setLocation(null);
    setLocError(null);
    alertSentNoLocRef.current = false;
    alertSentWithLocRef.current = false;
  };

  if (activated && type) {
    const number = numberFor(type, settings);
    const firstContact = contacts[0];
    const mapsUrl = location
      ? `https://maps.google.com/?q=${location.lat},${location.lon}`
      : null;
    const smsBody = location
      ? `EMERGENCY (${labelFor(type)}). I need help. My location: ${mapsUrl} (accuracy ~${Math.round(
          location.accuracy
        )}m)`
      : `EMERGENCY (${labelFor(type)}). I need help. Could not get my location.`;

    return (
      <>
        <BackBar title="SOS Active" href="/emergency" />
        <div className="px-4 py-5">
          <div className="rounded-2xl bg-red-600 p-5 text-center shadow-lg">
            <div className="text-xs uppercase tracking-widest opacity-90">Calling</div>
            <div className="mt-1 text-2xl font-bold">{labelFor(type)}</div>
            <div className="mt-2 text-4xl font-extrabold tracking-wide">{number}</div>
            <button
              onClick={() => dial(number)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-red-700 active:bg-red-50"
            >
              <Phone className="h-5 w-5" />
              Call again
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-2 text-sm text-zinc-300">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location ? (
                  <span>Location ready · accuracy ~{Math.round(location.accuracy)}m</span>
                ) : locError ? (
                  <span className="text-amber-400">{locError}</span>
                ) : settings.shareLocation ? (
                  <span>Getting your location…</span>
                ) : (
                  <span>Location sharing off</span>
                )}
              </div>
              {settings.shareLocation && (
                <button
                  onClick={fetchLocation}
                  aria-label="Retry location"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
              )}
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                rel="noreferrer"
                className="mt-2 block truncate text-xs text-blue-400 underline"
              >
                {mapsUrl}
              </a>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">
              Then call your contact
            </div>
            {firstContact ? (
              <div className="space-y-2">
                <button
                  onClick={() => dial(firstContact.phone)}
                  className="flex w-full items-center justify-between rounded-xl bg-blue-600 p-4 text-left font-semibold active:bg-blue-500"
                >
                  <span>
                    <span className="block">Call {firstContact.name}</span>
                    <span className="block text-xs font-normal opacity-90">
                      {firstContact.relationship || "Trusted contact"} · {firstContact.phone}
                    </span>
                  </span>
                  <Phone className="h-5 w-5" />
                </button>
                <a
                  href={`sms:${firstContact.phone.replace(/\s+/g, "")}?&body=${encodeURIComponent(smsBody)}`}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-center text-sm font-medium text-zinc-100 active:bg-zinc-800"
                >
                  Text {firstContact.name} my location
                </a>
              </div>
            ) : (
              <a
                href="/emergency/contacts"
                className="block rounded-xl border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400"
              >
                No trusted contacts yet — add one
              </a>
            )}
          </div>

          <button
            onClick={reset}
            className="mt-6 w-full rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 active:bg-zinc-800"
          >
            Done
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <BackBar title="SOS — Choose type" href="/emergency" />
      <div className="px-4 py-5">
        <p className="mb-6 text-sm text-zinc-400">
          Pick the type of emergency, then hold the button for 3 seconds to call.
        </p>
        <div className="flex flex-col items-center gap-8">
          <SosHoldButton
            label="Medical"
            sublabel="Injury, illness, unconscious"
            color="red"
            disabled={!ready}
            onActivate={() => onActivate("medical")}
          />
          <SosHoldButton
            label="Fire"
            sublabel="Fire, smoke, accident"
            color="orange"
            disabled={!ready}
            onActivate={() => onActivate("fire")}
          />
          <SosHoldButton
            label="Police"
            sublabel="Personal safety, crime"
            color="blue"
            disabled={!ready}
            onActivate={() => onActivate("police")}
          />
        </div>
        <p className="mt-8 text-center text-xs text-zinc-500">
          Holding will call the number you set in Settings.
        </p>
      </div>
    </>
  );
}
