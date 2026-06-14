"use client";

import type { AspectRatio, AudioStyle, ImageModel, Motion, StudioMode, VideoSource } from "./types";

// A single saved creation in the personal gallery (localStorage only).
export type Creation = {
  id: string;
  mode: StudioMode;
  prompt: string;
  url: string;
  ratio?: AspectRatio;
  model?: ImageModel;
  audioStyle?: AudioStyle;
  seed?: number;
  author?: string; // local profile name at the time it was created
  createdAt: number;
  favorite?: boolean;
  style?: string; // style preset id used
  // Free in-browser video: rendered live from these frames + a motion preset.
  source?: VideoSource;
  images?: string[];
  motion?: Motion;
  durationMs?: number;
  fps?: number;
};

const GALLERY_KEY = "studio:gallery:v1";
const SETTINGS_KEY = "studio:settings:v1";
const MAX_ITEMS = 120;

export function loadGallery(): Creation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGallery(items: Creation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GALLERY_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Storage full — drop the oldest half and retry once.
    try {
      window.localStorage.setItem(GALLERY_KEY, JSON.stringify(items.slice(0, Math.floor(MAX_ITEMS / 2))));
    } catch {
      /* give up silently */
    }
  }
}

export function addCreation(c: Creation): Creation[] {
  const next = [c, ...loadGallery()].slice(0, MAX_ITEMS);
  saveGallery(next);
  return next;
}

export function addCreations(cs: Creation[]): Creation[] {
  const next = [...cs, ...loadGallery()].slice(0, MAX_ITEMS);
  saveGallery(next);
  return next;
}

export function removeCreation(id: string): Creation[] {
  const next = loadGallery().filter((c) => c.id !== id);
  saveGallery(next);
  return next;
}

export function updateCreation(id: string, patch: Partial<Creation>): Creation[] {
  const next = loadGallery().map((c) => (c.id === id ? { ...c, ...patch } : c));
  saveGallery(next);
  return next;
}

export function toggleFavorite(id: string): Creation[] {
  const next = loadGallery().map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c));
  saveGallery(next);
  return next;
}

export function clearGallery(): Creation[] {
  saveGallery([]);
  return [];
}

export function replaceGallery(items: Creation[]): Creation[] {
  const next = items.slice(0, MAX_ITEMS);
  saveGallery(next);
  return next;
}

// --- Import / export the whole gallery as JSON ---
export function exportGalleryJSON(): string {
  return JSON.stringify(loadGallery(), null, 2);
}

export function importGalleryJSON(json: string): Creation[] {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Not a gallery export");
  // Merge with existing, de-duped by id, newest first.
  const seen = new Set<string>();
  const merged = [...parsed, ...loadGallery()].filter((c) => {
    if (!c || typeof c.id !== "string" || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  return replaceGallery(merged);
}

// --- Settings: the user's local profile, accent theme + the Replicate API key ---

export type StudioSettings = {
  replicateToken: string;
  pollinationsToken: string; // free token for unlimited images (auth.pollinations.ai)
  hfToken: string; // free Hugging Face token (huggingface.co/settings/tokens)
  name: string;
  email: string;
  accent: string;
};

const EMPTY_SETTINGS: StudioSettings = {
  replicateToken: "",
  pollinationsToken: "",
  hfToken: "",
  name: "",
  email: "",
  accent: "indigo",
};

export function loadSettings(): StudioSettings {
  if (typeof window === "undefined") return EMPTY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return EMPTY_SETTINGS;
    return { ...EMPTY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export function saveSettings(s: StudioSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
