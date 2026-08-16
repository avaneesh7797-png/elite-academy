// Shared types + presets for the Studio app (personal image / video / audio generator).
// No database — the backend is stateless and the gallery + API key live in localStorage.

export type StudioMode = "image" | "video" | "audio";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type ImageModel = "flux" | "flux-realism" | "flux-anime" | "flux-3d" | "turbo";

export type AudioStyle = "music" | "ambience" | "soundfx" | "speech";

// Full-resolution output for crisp, detailed images (FLUX handles 1MP+ well).
export const ASPECT_RATIOS: { value: AspectRatio; label: string; w: number; h: number }[] = [
  { value: "1:1", label: "Square 1:1", w: 1024, h: 1024 },
  { value: "16:9", label: "Wide 16:9", w: 1024, h: 576 },
  { value: "9:16", label: "Portrait 9:16", w: 576, h: 1024 },
  { value: "4:3", label: "Standard 4:3", w: 1024, h: 768 },
  { value: "3:4", label: "Tall 3:4", w: 768, h: 1024 },
];

// Turbo first: it's the fast, reliable default. Flux looks best but is slower
// and more prone to timing out under load.
export const IMAGE_MODELS: { value: ImageModel; label: string }[] = [
  { value: "turbo", label: "Turbo (fast — recommended)" },
  { value: "flux", label: "Flux (best quality, slower)" },
  { value: "flux-realism", label: "Flux Realism (slower)" },
  { value: "flux-anime", label: "Flux Anime (slower)" },
  { value: "flux-3d", label: "Flux 3D (slower)" },
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
  // Optional source image for video mode → image-to-video. Either a remote URL
  // (e.g. an image generated in the app) or a data: URI from an uploaded file.
  image?: string;
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

// ----------------------------------------------------------------------------
// Studio Pro: style presets, prompt tools, motion engine, accent themes
// ----------------------------------------------------------------------------

// A style preset appends descriptive modifiers to the prompt for a consistent look.
export type StylePreset = { id: string; label: string; suffix: string };

export const STYLE_PRESETS: StylePreset[] = [
  { id: "none", label: "No style", suffix: "" },
  { id: "cinematic", label: "Cinematic", suffix: ", cinematic lighting, dramatic, film still, 35mm, shallow depth of field, highly detailed" },
  { id: "photoreal", label: "Photoreal", suffix: ", photorealistic, ultra detailed, 8k, sharp focus, professional photography, natural light" },
  { id: "anime", label: "Anime", suffix: ", anime style, vibrant colors, studio anime, clean line art, detailed background" },
  { id: "digital-art", label: "Digital art", suffix: ", digital art, trending on artstation, highly detailed, concept art, vivid" },
  { id: "watercolor", label: "Watercolor", suffix: ", watercolor painting, soft washes, textured paper, delicate, artistic" },
  { id: "3d-render", label: "3D render", suffix: ", 3d render, octane, soft global illumination, subsurface scattering, high detail" },
  { id: "cyberpunk", label: "Cyberpunk", suffix: ", cyberpunk, neon lights, futuristic city, moody, high contrast, rain" },
  { id: "minimal", label: "Minimal", suffix: ", minimalist, clean, simple shapes, elegant, lots of negative space" },
  { id: "fantasy", label: "Fantasy", suffix: ", epic fantasy, magical, ethereal glow, intricate, dramatic lighting" },
  { id: "vintage", label: "Vintage", suffix: ", vintage photo, retro, film grain, faded colors, nostalgic, 1970s" },
  { id: "pixel", label: "Pixel art", suffix: ", pixel art, 16-bit, retro game style, crisp pixels" },
];

const QUALITY_BOOST = ", highly detailed, sharp focus, intricate, professional, masterpiece, best quality, 8k";

// "Enhance" — append quality boosters without duplicating them.
export function enhancePrompt(p: string): string {
  const t = p.trim().replace(/[.,\s]+$/, "");
  if (!t || /masterpiece|best quality|8k/i.test(t)) return t;
  return t + QUALITY_BOOST;
}

export function applyStyle(p: string, styleId: string): string {
  const s = STYLE_PRESETS.find((x) => x.id === styleId);
  return s && s.suffix ? `${p}${s.suffix}` : p;
}

// A bare 1–3 word prompt (e.g. "ronaldo") gives generic/cartoonish results.
// When no explicit style is chosen, nudge short prompts toward a detailed,
// realistic render so the output is much better out of the box.
export function expandShortPrompt(p: string): string {
  const t = p.trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return t;
  return `${t}, highly detailed, photorealistic, sharp focus, professional photography, 4k`;
}

// A negative prompt has no native Pollinations field, so fold it into the text.
export function withNegative(p: string, negative: string): string {
  const n = negative.trim();
  return n ? `${p}. Avoid: ${n}` : p;
}

// Append quality/fidelity boosters (helps every prompt look sharper), without
// duplicating if the prompt already asks for them.
export function withQuality(p: string): string {
  const t = p.trim();
  if (!t || /8k|ultra[- ]?detailed|masterpiece|best quality|high quality/i.test(t)) return t;
  return `${t.replace(/[.,\s]+$/, "")}, ultra-detailed, high quality, sharp focus, 8k`;
}

// ---- Free text-to-video: build a cinematic "storyboard" of keyframe prompts ----
// No free API does real AI video, so we generate several keyframes for the same
// scene (fixed seed keeps it consistent) from evolving camera/shot descriptions,
// then the in-browser engine crossfades + pans between them into a real clip.
const SHOT_MODIFIERS = [
  "wide establishing shot, cinematic lighting",
  "medium shot, dynamic angle, cinematic",
  "dramatic close-up, shallow depth of field, cinematic",
  "low-angle hero shot, epic, cinematic",
  "sweeping aerial view, cinematic",
  "over-the-shoulder shot, depth, cinematic",
  "extreme close-up, intricate detail, cinematic",
  "wide shot, golden-hour glow, cinematic",
  "tracking shot, motion blur, cinematic",
  "top-down view, symmetrical, cinematic",
  "side profile shot, rim light, cinematic",
  "reverse angle, atmospheric haze, cinematic",
];

export const STORY_SHOTS = [4, 6, 8, 10] as const;
export type StoryShots = (typeof STORY_SHOTS)[number];

// Returns `n` keyframe prompts for one scene, each a different cinematic shot.
export function buildStoryboard(base: string, n: number): string[] {
  const clean = base.trim().replace(/[.,\s]+$/, "") || "a cinematic scene";
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(`${clean}, ${SHOT_MODIFIERS[i % SHOT_MODIFIERS.length]}, highly detailed, sharp focus`);
  }
  return out;
}

// ---- FRAME-BY-FRAME animation: generate MANY images, each a micro-step of the
// same motion, then play them back fast. Images are free, so we trade time for
// real animation instead of paying for a video GPU. A fixed seed + "same scene"
// wording keeps frames coherent; the phase text nudges the motion forward.
// You pick how LONG the video should be; the app works out how many frames it
// needs to look smooth. Longer clip = more frames = longer to generate.
export const ANIM_SECONDS = [3, 5, 8, 12, 20] as const;
export type AnimSeconds = (typeof ANIM_SECONDS)[number];

// Smoothness presets → playback fps. Frames needed = seconds × fps.
export const ANIM_SMOOTHNESS = [
  { value: 8, label: "Quick (8 fps)" },
  { value: 12, label: "Smooth (12 fps)" },
  { value: 16, label: "Very smooth (16 fps)" },
] as const;

// Hard cap so a 20s × 16fps request can't queue 320 image generations.
export const ANIM_MAX_FRAMES = 160;

// How many frames to actually draw for a given length + smoothness.
export function framesForVideo(seconds: number, fps: number): number {
  return Math.max(8, Math.min(ANIM_MAX_FRAMES, Math.round(seconds * fps)));
}

// Where we are in the motion. Kept to a SHORT, uniform phrase: with a fixed
// seed, the smaller the textual difference between frames, the more the model
// keeps the same composition and only advances the movement.
function motionPhase(t: number): string {
  return `t=${(Math.round(t * 100) / 100).toFixed(2)}`;
}

// Returns `n` prompts describing consecutive moments of ONE continuous shot.
// Kept compact: the API caps prompts at 1200 chars, and long boilerplate
// dilutes the part that actually differs between frames (the motion phase).
export function buildFrameSequence(base: string, n: number): string[] {
  const clean = base.trim().replace(/[.,\s]+$/, "").slice(0, 600) || "a cinematic scene";
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0 : i / (n - 1);
    // The shared text is byte-identical across frames; only the tiny timestamp
    // differs. With a fixed seed this yields the same scene with the action
    // slightly advanced, instead of a brand-new picture per frame.
    out.push(
      `${clean}. Single locked-off cinematic shot, identical framing and lighting ` +
        `in every frame, subject mid-motion with motion blur, photorealistic film still. ` +
        `[${motionPhase(t)}]`,
    );
  }
  return out;
}

export const RANDOM_PROMPTS: string[] = [
  "A bioluminescent jellyfish floating through a dark coral reef, macro photography",
  "An astronaut planting a glowing flower on a red alien planet, cinematic",
  "A cozy bookshop cafe on a rainy evening, warm lights, watercolor",
  "A majestic snow leopard on a Himalayan ridge at sunrise, ultra detailed",
  "A floating island city with waterfalls, fantasy concept art",
  "A vintage robot watering plants in a sunlit greenhouse, 3d render",
  "A samurai standing in a field of red maple leaves, dramatic light",
  "A neon-soaked cyberpunk alley with steam and reflections, night",
  "A hot air balloon festival over Cappadocia at dawn, photorealistic",
  "A whimsical treehouse village connected by rope bridges, golden hour",
  "A galaxy swirling inside a glass marble on a wooden desk, macro",
  "A lighthouse braving a giant stormy wave, epic, moody",
  "A panda DJ at a futuristic neon nightclub, fun, vibrant",
  "An underwater ancient temple with rays of light, mysterious",
  "A steampunk airship docking at a cloud city, intricate detail",
  "A field of sunflowers under a dramatic thunderstorm sky",
  "A tiny dragon curled up asleep on a stack of gold coins",
  "A serene Japanese garden with a koi pond in autumn",
  "A retro 80s synthwave landscape with a grid sun, neon",
  "A chef plating a glowing magical dessert, cinematic close-up",
];

export function randomPrompt(): string {
  return RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
}

// ---- Free in-browser video: motion presets ----
export type Motion =
  | "frames"
  | "kenburns"
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "pan-up"
  | "pan-down"
  | "float"
  | "morph";

export const MOTION_PRESETS: { value: Motion; label: string; needsFrames?: boolean }[] = [
  { value: "frames", label: "True animation 🎞️ (many frames)", needsFrames: true },
  { value: "kenburns", label: "Ken Burns" },
  { value: "zoom-in", label: "Zoom in" },
  { value: "zoom-out", label: "Zoom out" },
  { value: "pan-left", label: "Pan left" },
  { value: "pan-right", label: "Pan right" },
  { value: "pan-up", label: "Pan up" },
  { value: "pan-down", label: "Pan down" },
  { value: "float", label: "Gentle float" },
  { value: "morph", label: "AI video ✨ (text → clip)", needsFrames: true },
];

export const VIDEO_DURATIONS = [2, 3, 4, 6, 8] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export type VideoSource = "free" | "replicate";

// Pro (Replicate) text-to-video models. Cheap default first.
export const PRO_VIDEO_MODELS: { value: string; label: string }[] = [
  { value: "wan-video/wan-2.1-1.3b", label: "Fast & cheap (Wan 2.1)" },
  { value: "minimax/video-01", label: "Best quality (Minimax)" },
];

// ---- Accent themes (gradient class strings live here so Tailwind keeps them) ----
export type Accent = "indigo" | "violet" | "emerald" | "rose" | "amber" | "sky";

export const ACCENT_THEMES: {
  value: Accent;
  label: string;
  gradient: string; // for buttons / logo glow
  solid: string; // active tab background
  text: string; // accent text
  shadow: string;
}[] = [
  { value: "indigo", label: "Indigo", gradient: "from-indigo-500 to-fuchsia-500", solid: "bg-indigo-500", text: "text-indigo-300", shadow: "shadow-fuchsia-500/20" },
  { value: "violet", label: "Violet", gradient: "from-violet-500 to-purple-500", solid: "bg-violet-500", text: "text-violet-300", shadow: "shadow-violet-500/20" },
  { value: "emerald", label: "Emerald", gradient: "from-emerald-500 to-teal-500", solid: "bg-emerald-500", text: "text-emerald-300", shadow: "shadow-emerald-500/20" },
  { value: "rose", label: "Rose", gradient: "from-rose-500 to-pink-500", solid: "bg-rose-500", text: "text-rose-300", shadow: "shadow-rose-500/20" },
  { value: "amber", label: "Amber", gradient: "from-amber-500 to-orange-500", solid: "bg-amber-500", text: "text-amber-300", shadow: "shadow-amber-500/20" },
  { value: "sky", label: "Sky", gradient: "from-sky-500 to-cyan-500", solid: "bg-sky-500", text: "text-sky-300", shadow: "shadow-sky-500/20" },
];

export function accentTheme(a: Accent) {
  return ACCENT_THEMES.find((t) => t.value === a) ?? ACCENT_THEMES[0];
}
