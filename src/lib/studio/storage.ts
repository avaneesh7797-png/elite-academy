"use client";

import type { AspectRatio, ImageModel, StudioMode } from "./types";

// A single saved creation in the personal gallery (localStorage only).
export type Creation = {
  id: string;
  mode: StudioMode;
  prompt: string;
  url: string;
  ratio: AspectRatio;
  model?: ImageModel;
  seed?: number;
  createdAt: number;
};

const KEY = "studio:gallery:v1";
const MAX_ITEMS = 100;

export function loadGallery(): Creation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGallery(items: Creation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
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
