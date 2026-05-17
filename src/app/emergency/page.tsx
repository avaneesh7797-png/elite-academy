"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Crown,
  HeartPulse,
  MapPin,
  Settings as SettingsIcon,
  ShieldAlert,
  User as UserIcon,
  Users,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { loadContacts, loadProfile, loadSettings } from "@/lib/emergency/storage";
import { useEmergencyStatus } from "@/lib/emergency/use-emergency-status";
import { InstallCard } from "@/components/emergency/install-card";

export default function EmergencyHome() {
  const [profileName, setProfileName] = useState("");
  const [contactsCount, setContactsCount] = useState(0);
  const [medicalNumber, setMedicalNumber] = useState("911");
  const { status } = useEmergencyStatus();

  useEffect(() => {
    const p = loadProfile();
    setProfileName(p.name);
    setContactsCount(loadContacts().length);
    setMedicalNumber(loadSettings().medicalNumber);
  }, []);

  return (
    <div className="px-4 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emergency</h1>
          <p className="text-sm text-zinc-400">One-tap help when seconds count.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/emergency/account"
            aria-label="Account"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            <UserIcon className="h-5 w-5" />
            {status.isPremium && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
                <Crown className="h-2.5 w-2.5" />
              </span>
            )}
          </Link>
          <Link
            href="/emergency/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <Link
        href="/emergency/sos"
        className="group block rounded-2xl bg-gradient-to-br from-red-600 to-red-700 p-5 shadow-lg ring-1 ring-red-400/30 active:scale-[0.99]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold">SOS</div>
            <div className="text-sm text-red-100/90">Tap to choose emergency type, then hold 3 sec to call</div>
          </div>
        </div>
      </Link>

      <InstallCard />

      {!status.isPremium && (
        <Link
          href="/emergency/upgrade"
          className="mt-3 flex items-center gap-3 rounded-xl border border-amber-700/40 bg-gradient-to-br from-amber-900/30 to-zinc-900 p-3 active:scale-[0.99]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <Crown className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm">
            <div className="font-semibold">Unlock Premium</div>
            <div className="text-xs text-zinc-400">Cloud sync · Nearby help · Family circle</div>
          </div>
          <span className="text-xs text-amber-300">₹2000 once</span>
        </Link>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <DashCard
          href="/emergency/medical-id"
          icon={<HeartPulse className="h-6 w-6" />}
          title="Medical ID"
          subtitle={profileName ? profileName : "Not set up"}
          accent="bg-pink-600/15 text-pink-300"
        />
        <DashCard
          href="/emergency/contacts"
          icon={<Users className="h-6 w-6" />}
          title="Trusted Contacts"
          subtitle={contactsCount === 0 ? "Add a contact" : `${contactsCount} saved`}
          accent="bg-blue-600/15 text-blue-300"
        />
        <DashCard
          href="/emergency/first-aid"
          icon={<BookOpen className="h-6 w-6" />}
          title="First Aid"
          subtitle="Step-by-step guides"
          accent="bg-emerald-600/15 text-emerald-300"
        />
        <DashCard
          href="/emergency/nearby"
          icon={<MapPin className="h-6 w-6" />}
          title="Nearby Help"
          subtitle={status.isPremium ? "Hospitals & AEDs" : "Premium"}
          accent="bg-amber-600/15 text-amber-300"
          locked={!status.isPremium}
        />
        <DashCard
          href="/emergency/family"
          icon={<UsersRound className="h-6 w-6" />}
          title="Family Circle"
          subtitle={status.isPremium ? "Share location" : "Premium"}
          accent="bg-cyan-600/15 text-cyan-300"
          locked={!status.isPremium}
        />
        <DashCard
          href="/emergency/settings"
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Emergency #s"
          subtitle={`Medical: ${medicalNumber}`}
          accent="bg-orange-600/15 text-orange-300"
        />
        <DashCard
          href="/emergency/account"
          icon={<UserIcon className="h-6 w-6" />}
          title="Account"
          subtitle={status.user ? status.user.name : "Sign in / Sign up"}
          accent="bg-violet-600/15 text-violet-300"
        />
      </div>

      <p className="mt-8 px-1 text-center text-xs leading-relaxed text-zinc-500">
        This app helps you reach help and gives general first aid information. It is not a substitute
        for professional medical advice. In a real emergency, call your local emergency number.
      </p>
    </div>
  );
}

function DashCard({
  href,
  icon,
  title,
  subtitle,
  accent,
  locked,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:scale-[0.98]"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accent}`}>
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{subtitle}</div>
      </div>
      {locked && (
        <span className="absolute right-3 top-3 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
          Pro
        </span>
      )}
    </Link>
  );
}
