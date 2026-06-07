// Shared types + presets for the Studio app (personal image / video / audio generator).
// No database — the backend is stateless and the gallery + API key live in localStorage.

export type StudioMode = "image" | "video" | "audio";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type ImageModel = "flux" | "flux-realism" | "flux-anime" | "flux-3d" | "turbo";

export type AudioStyle = "music" | "ambience" | "soundfx" | "speech";

export const ASPECT_RATIOS: { value: AspectRatio; label: string; w: number; h: number }[] = [
  { value: "1:1", label: "Square 1:1", w: 1024, h: 1024 },
  { value: "16:9", label: "Wide 16:9", w: 1280, h: 720 },
  { value: "9:16", label: "Portrait 9:16", w: 720, h: 1280 },
  { value: "4:3", label: "Standard 4:3", w: 1024, h: 768 },
  { value: "3:4", label: "Tall 3:4", w: 768, h: 1024 },
];

export const IMAGE_MODELS: { value: ImageModel; label: string }[] = [
  { value: "flux", label: "Flux (balanced)" },
  { value: "flux-realism", label: "Flux Realism" },
  { value: "flux-anime", label: "Flux Anime" },
  { value: "flux-3d", label: "Flux 3D" },
  { value: "turbo", label: "Turbo (fast)" },
];

// Audio "styles" tweak the prompt sent to the model so one text-to-audio
// model can cover music, ambience, sound effects and spoken word.
export const AUDIO_STYLES: { value: AudioStyle; label: string; hint: string }[] = [
  { value: "music", label: "Music", hint: "high quality music, " },
  { value: "ambience", label: "Ambience", hint: "ambient background soundscape, " },
  { value: "soundfx", label: "Sound FX", hint: "short sound effect, " },
  { value: "speech", label: "Speech / Narration", hint: "clear spoken narration: " },
];

export const AUDIO_DURATIONS = [5, 8, 10, 15, 30] as const;
export type AudioDuration = (typeof AUDIO_DURATIONS)[number];

export function dimensionsFor(ratio: AspectRatio): { w: number; h: number } {
  const found = ASPECT_RATIOS.find((r) => r.value === ratio);
  return found ? { w: found.w, h: found.h } : { w: 1024, h: 1024 };
}

export function audioPrompt(style: AudioStyle, prompt: string): string {
  const found = AUDIO_STYLES.find((s) => s.value === style);
  return `${found?.hint ?? ""}${prompt}`;
}

// Request shape for POST /api/studio/generate
export type GenerateRequest = {
  mode: StudioMode;
  prompt: string;
  ratio?: AspectRatio;
  model?: ImageModel;
  seed?: number;
  audioStyle?: AudioStyle;
  duration?: AudioDuration;
};

// What the API returns for an image request.
export type ImageResult = {
  kind: "image";
  url: string;
  prompt: string;
  seed: number;
};

// What the API returns when kicking off a Replicate job (video or audio).
export type MediaJob = {
  kind: "video" | "audio";
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  url?: string;
  error?: string;
};

export type ApiError = { error: string; message: string };

export type GenerateResponse = ImageResult | MediaJob | ApiError;
