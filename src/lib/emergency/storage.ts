"use client";

export type MedicalProfile = {
  name: string;
  dob: string;
  bloodType: string;
  weight: string;
  height: string;
  allergies: string;
  conditions: string;
  medications: string;
  doctorName: string;
  doctorPhone: string;
  insurance: string;
  iceName: string;
  iceRelationship: string;
   icePhone: string;
  notes: string;
};

export type TrustedContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
};

export type EmergencyType = "medical" | "fire" | "police";

export type EmergencySettings = {
  medicalNumber: string;
  fireNumber: string;
  policeNumber: string;
  country: string;
  shareLocation: boolean;
};

const KEYS = {
  profile: "emergency:medical-profile:v1",
  contacts: "emergency:trusted-contacts:v1",
  settings: "emergency:settings:v1",
} as const;

export const EMPTY_PROFILE: MedicalProfile = {
  name: "",
  dob: "",
  bloodType: "",
  weight: "",
  height: "",
  allergies: "",
  conditions: "",
  medications: "",
  doctorName: "",
  doctorPhone: "",
  insurance: "",
  iceName: "",
  iceRelationship: "",
  icePhone: "",
  notes: "",
};

export const DEFAULT_SETTINGS: EmergencySettings = {
  medicalNumber: "911",
  fireNumber: "911",
  policeNumber: "911",
  country: "US",
  shareLocation: true,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed } as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadProfile(): MedicalProfile {
  return read(KEYS.profile, EMPTY_PROFILE);
}
export function saveProfile(p: MedicalProfile) {
  write(KEYS.profile, p);
}

export function loadContacts(): TrustedContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEYS.contacts);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
export function saveContacts(c: TrustedContact[]) {
  write(KEYS.contacts, c);
}

export function loadSettings(): EmergencySettings {
  return read(KEYS.settings, DEFAULT_SETTINGS);
}
export function saveSettings(s: EmergencySettings) {
  write(KEYS.settings, s);
}

export function numberFor(type: EmergencyType, s: EmergencySettings): string {
  if (type === "medical") return s.medicalNumber;
  if (type === "fire") return s.fireNumber;
  return s.policeNumber;
}

export function labelFor(type: EmergencyType): string {
  if (type === "medical") return "Medical Emergency";
  if (type === "fire") return "Fire / Accident";
  return "Police / Personal Safety";
}
