"use client";

import type { AspectRatio, AudioStyle, ImageModel, StudioMode } from "./types";

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
};

const GALLERY_KEY = "studio:gallery:v1";
const SETTINGS_KEY = "studio:settings:v1";
const MAX_ITEMS = 100;

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
  window.localStorage.setItem(GALLERY_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function addCreation(c: Creation): Creation[] {
  const next = [c, ...loadGallery()].slice(0, MAX_ITEMS);
  saveGallery(next);
  return next;
}

export function removeCreation(id: string): Creation[] {
  const next = loadGallery().filter((c) => c.id !== id);
  saveGallery(next);
  return next;
}

export function clearGallery(): Creation[] {
  saveGallery([]);
  return [];
}

// --- Settings: the user's local profile + the Replicate API key ---

export type StudioSettings = {
  replicateToken: string;
  name: string;
  email: string;
};

const EMPTY_SETTINGS: StudioSettings = { replicateToken: "", name: "", email: "" };

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
