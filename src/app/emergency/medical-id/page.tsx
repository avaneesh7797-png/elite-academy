"use client";

import { useEffect, useState } from "react";
import { BackBar } from "@/components/emergency/back-bar";
import {
  EMPTY_PROFILE,
  MedicalProfile,
  loadProfile,
  saveProfile,
} from "@/lib/emergency/storage";

export default function MedicalIdPage() {
  const [profile, setProfile] = useState<MedicalProfile>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const update = <K extends keyof MedicalProfile>(key: K, value: MedicalProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <BackBar title="Medical ID" />
      <form onSubmit={onSave} className="space-y-5 px-4 py-5">
        <p className="text-xs text-zinc-400">
          Stored only on this device. Shown to paramedics or a bystander when you can&apos;t speak.
        </p>

        <Section title="Basics">
          <Field label="Full name" value={profile.name} onChange={(v) => update("name", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth" type="date" value={profile.dob} onChange={(v) => update("dob", v)} />
            <Field label="Blood type" placeholder="e.g. O+" value={profile.bloodType} onChange={(v) => update("bloodType", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight" placeholder="e.g. 70 kg" value={profile.weight} onChange={(v) => update("weight", v)} />
            <Field label="Height" placeholder="e.g. 175 cm" value={profile.height} onChange={(v) => update("height", v)} />
          </div>
        </Section>

        <Section title="Allergies & conditions">
          <TextArea
            label="Allergies"
            placeholder="e.g. Penicillin, peanuts, latex"
            value={profile.allergies}
            onChange={(v) => update("allergies", v)}
          />
          <TextArea
            label="Medical conditions"
            placeholder="e.g. Asthma, type 1 diabetes"
            value={profile.conditions}
            onChange={(v) => update("conditions", v)}
          />
        </Section>

        <Section title="Medications">
          <TextArea
            label="Current medications & dosages"
            placeholder="e.g. Metformin 500 mg twice daily"
            value={profile.medications}
            onChange={(v) => update("medications", v)}
          />
        </Section>

        <Section title="Doctor & insurance">
          <Field label="Doctor's name" value={profile.doctorName} onChange={(v) => update("doctorName", v)} />
          <Field
            label="Doctor's phone"
            type="tel"
            value={profile.doctorPhone}
            onChange={(v) => update("doctorPhone", v)}
          />
          <Field
            label="Insurance / policy"
            value={profile.insurance}
            onChange={(v) => update("insurance", v)}
          />
        </Section>

        <Section title="In Case of Emergency (ICE)">
          <Field label="Name" value={profile.iceName} onChange={(v) => update("iceName", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Relationship"
              placeholder="e.g. Spouse"
              value={profile.iceRelationship}
              onChange={(v) => update("iceRelationship", v)}
            />
            <Field
              label="Phone"
              type="tel"
              value={profile.icePhone}
              onChange={(v) => update("icePhone", v)}
            />
          </div>
        </Section>

        <Section title="Notes">
          <TextArea
            label="Other notes for responders"
            placeholder="e.g. Hearing impaired, organ donor"
            value={profile.notes}
            onChange={(v) => update("notes", v)}
          />
        </Section>

        <button
          type="submit"
          className="sticky bottom-3 z-10 w-full rounded-xl bg-red-600 py-3 font-semibold text-white shadow-lg active:bg-red-500"
        >
          {saved ? "Saved ✓" : "Save Medical ID"}
        </button>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
      />
    </label>
  );
}
