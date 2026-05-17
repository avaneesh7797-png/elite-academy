"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  HeartPulse,
  Settings as SettingsIcon,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { loadContacts, loadProfile, loadSettings } from "@/lib/emergency/storage";

export default function EmergencyHome() {
  const [profileName, setProfileName] = useState("");
  const [contactsCount, setContactsCount] = useState(0);
  const [medicalNumber, setMedicalNumber] = useState("911");

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
        <Link
          href="/emergency/settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          <SettingsIcon className="h-5 w-5" />
        </Link>
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
          href="/emergency/settings"
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Emergency #s"
          subtitle={`Medical: ${medicalNumber}`}
          accent="bg-amber-600/15 text-amber-300"
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
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:scale-[0.98]"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accent}`}>
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{subtitle}</div>
      </div>
    </Link>
  );
}
