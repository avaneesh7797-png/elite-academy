"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  Bell,
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";
import { formatRelativeTime } from "@/lib/emergency/family";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: string;
  nickname: string;
  isMe: boolean;
  location: { lat: number; lon: number; accuracy: number | null; updatedAt: string; fresh: boolean } | null;
};

type Alert = {
  id: string;
  type: string;
  message: string;
  lat: number | null;
  lon: number | null;
  createdAt: string;
  acknowledgedAt: string | null;
  from: { id: string; name: string; isMe: boolean };
};

type FamilyData = {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  members: Member[];
  alerts: Alert[];
};

const POLL_MS = 15_000;
const LOCATION_POST_MS = 30_000;

export default function FamilyPage() {
  const { status, loading: statusLoading } = useEmergencyStatus();
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const lastLocationPost = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/emergency/family", { cache: "no-store" });
      const data = await r.json();
      if (r.ok) setFamily(data.family);
    } catch {
      // network — keep last
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!status.isPremium) {
      setLoaded(true);
      return;
    }
    refresh();
    const i = setInterval(refresh, POLL_MS);
    return () => clearInterval(i);
  }, [status.isPremium, refresh]);

  useEffect(() => {
    if (!family || !("geolocation" in navigator)) return;
    let watchId: number | null = null;
    const postIfDue = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastLocationPost.current < LOCATION_POST_MS) return;
      lastLocationPost.current = now;
      fetch("/api/emergency/family/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      }).catch(() => {});
    };
    watchId = navigator.geolocation.watchPosition(
      postIfDue,
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [family]);

  const createCircle = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/emergency/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Circle" }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error || "Could not create circle.");
      else await refresh();
    } finally {
      setBusy(false);
    }
  };

  const joinCircle = async (code: string) => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/emergency/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error || "Could not join.");
      else await refresh();
    } finally {
      setBusy(false);
    }
  };

  const leaveCircle = async () => {
    setBusy(true);
    try {
      await fetch("/api/emergency/family", { method: "DELETE" });
      setFamily(null);
      setShowLeave(false);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    setBusy(true);
    try {
      await fetch(`/api/emergency/family/members/${userId}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const ackAlert = async (id: string) => {
    await fetch(`/api/emergency/family/alert/${id}/ack`, { method: "POST" });
    await refresh();
  };

  const copyCode = async () => {
    if (!family) return;
    try {
      await navigator.clipboard.writeText(family.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (statusLoading || !loaded) {
    return (
      <>
        <BackBar title="Family Circle" />
        <div className="px-4 py-10 text-center text-zinc-400">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      </>
    );
  }

  if (!status.user) {
    return (
      <>
        <BackBar title="Family Circle" />
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-zinc-400">Sign in to use family sharing.</p>
          <Link
            href="/emergency/account"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go to Account
          </Link>
        </div>
      </>
    );
  }

  if (!status.isPremium) {
    return (
      <>
        <BackBar title="Family Circle" />
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <Users className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Premium feature</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-400">
            See where your family is and broadcast SOS alerts to everyone in your circle.
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

  if (!family) {
    return (
      <>
        <BackBar title="Family Circle" />
        <NoFamilyView onCreate={createCircle} onJoin={joinCircle} busy={busy} error={error} />
      </>
    );
  }

  const activeAlerts = family.alerts.filter((a) => !a.acknowledgedAt && !a.from.isMe);

  return (
    <>
      <BackBar title="Family Circle" />
      <div className="px-4 py-5 space-y-4">
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            {activeAlerts.map((a) => (
              <AlertCard key={a.id} alert={a} onAck={() => ackAlert(a.id)} />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{family.name}</div>
              <div className="text-xs text-zinc-400">
                {family.members.length} member{family.members.length === 1 ? "" : "s"}
                {family.isOwner && " · You're the owner"}
              </div>
            </div>
            <button
              onClick={() => setShowLeave((v) => !v)}
              className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              {family.isOwner ? "Delete" : "Leave"}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2">
            <UserPlus className="h-4 w-4 text-zinc-500" />
            <span className="text-xs text-zinc-400">Invite code</span>
            <span className="ml-auto font-mono text-sm tracking-widest text-amber-300">{family.inviteCode}</span>
            <button
              onClick={copyCode}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              aria-label="Copy"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {showLeave && (
            <div className="mt-3 rounded-lg border border-red-700/40 bg-red-900/20 p-3 text-sm">
              <p className="text-red-300">
                {family.isOwner
                  ? "Delete this circle? All members lose access."
                  : "Leave this circle? Your location stops sharing."}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={leaveCircle}
                  disabled={busy}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {family.isOwner ? "Delete" : "Leave"}
                </button>
                <button
                  onClick={() => setShowLeave(false)}
                  className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {family.members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              isOwner={family.isOwner}
              onRemove={() => removeMember(m.userId)}
            />
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-3 text-xs text-zinc-400">
          <p>
            Your location updates while this screen is open. Other members&apos; positions refresh every{" "}
            {POLL_MS / 1000}s.
          </p>
        </div>

        {family.alerts.filter((a) => a.acknowledgedAt).length > 0 && (
          <details className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <summary className="cursor-pointer text-xs text-zinc-400">Recent alerts</summary>
            <div className="mt-2 space-y-2">
              {family.alerts
                .filter((a) => a.acknowledgedAt || a.from.isMe)
                .map((a) => (
                  <div key={a.id} className="rounded-lg bg-zinc-950 p-2 text-xs text-zinc-400">
                    <span className="font-medium text-zinc-200">{a.from.isMe ? "You" : a.from.name}</span> · {a.type}
                    {" · "}
                    {formatRelativeTime(a.createdAt)}
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>
    </>
  );
}

function NoFamilyView({
  onCreate,
  onJoin,
  busy,
  error,
}: {
  onCreate: () => void;
  onJoin: (code: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState("");
  return (
    <div className="px-4 py-6 space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
          <Users className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold">Create a circle</h2>
        <p className="mt-1 text-xs text-zinc-400">You&apos;ll get an invite code to share with family.</p>
        <button
          onClick={onCreate}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Create circle
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-base font-semibold">Join with a code</h2>
        <p className="mt-1 text-xs text-zinc-400">Someone shared a 6-letter code with you?</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) onJoin(code.trim());
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono uppercase tracking-widest text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            Join
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isOwner,
  onRemove,
}: {
  member: Member;
  isOwner: boolean;
  onRemove: () => void;
}) {
  const dirUrl = member.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${member.location.lat},${member.location.lon}`
    : null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-300 font-semibold">
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{member.name}</span>
          {member.isMe && (
            <span className="rounded bg-blue-600/30 px-1.5 py-0.5 text-[10px] uppercase text-blue-300">You</span>
          )}
          {member.role === "owner" && (
            <Crown className="h-3 w-3 text-amber-400" aria-label="Owner" />
          )}
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">
          {member.location ? (
            <span className={member.location.fresh ? "text-emerald-400" : "text-zinc-500"}>
              <MapPin className="mr-1 inline h-3 w-3" />
              {member.location.fresh ? "Live · " : "Last seen "}
              {formatRelativeTime(member.location.updatedAt)}
              {member.location.accuracy != null && ` · ±${Math.round(member.location.accuracy)}m`}
            </span>
          ) : (
            <span className="text-zinc-500">No location shared yet</span>
          )}
        </div>
      </div>
      {dirUrl && (
        <a
          href={dirUrl}
          target="_blank"
          rel="noopener"
          aria-label="Directions"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white"
        >
          <MapPin className="h-4 w-4" />
        </a>
      )}
      {isOwner && !member.isMe && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${member.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-red-900/40 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AlertCard({ alert, onAck }: { alert: Alert; onAck: () => void }) {
  const isSos = alert.type === "sos";
  const dirUrl = alert.lat != null && alert.lon != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${alert.lat},${alert.lon}`
    : null;
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isSos ? "border-red-600 bg-red-900/30 animate-pulse" : "border-amber-700/40 bg-amber-900/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
            isSos ? "bg-red-600 text-white" : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {isSos ? <AlertOctagon className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <div className="font-semibold">
            {isSos ? "SOS" : alert.type === "check-in" ? "Check-in" : "Alert"} from {alert.from.name}
          </div>
          <div className="mt-0.5 text-xs text-zinc-300">
            {formatRelativeTime(alert.createdAt)}
            {alert.message ? ` · ${alert.message}` : ""}
          </div>
          {dirUrl && (
            <a
              href={dirUrl}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
            >
              <MapPin className="h-3 w-3" /> Directions
            </a>
          )}
        </div>
        <button
          onClick={onAck}
          className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
