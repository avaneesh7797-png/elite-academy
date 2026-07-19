"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clapperboard,
  Copy,
  Download,
  Film,
  Heart,
  ImageIcon,
  ImagePlus,
  KeyRound,
  Loader2,
  Maximize2,
  Music,
  Palette,
  RefreshCw,
  Repeat2,
  Search,
  Share2,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  User,
  Video,
  Wand2,
  X,
} from "lucide-react";
import {
  ACCENT_THEMES,
  ASPECT_RATIOS,
  AUDIO_DURATIONS,
  AUDIO_STYLES,
  IMAGE_MODELS,
  MOTION_PRESETS,
  PRO_VIDEO_MODELS,
  STORY_SHOTS,
  STYLE_PRESETS,
  buildStoryboard,
  VIDEO_DURATIONS,
  accentTheme,
  applyStyle,
  enhancePrompt,
  expandShortPrompt,
  randomPrompt,
  withNegative,
  type AspectRatio,
  type AudioDuration,
  type AudioStyle,
  type ImageModel,
  type Motion,
  type StudioMode,
  type VideoDuration,
} from "@/lib/studio/types";
import {
  addCreation,
  addCreations,
  clearGallery,
  exportGalleryJSON,
  importGalleryJSON,
  loadGallery,
  loadSettings,
  removeCreation,
  saveSettings,
  toggleFavorite,
  type Creation,
} from "@/lib/studio/storage";
import { MUSIC_MOODS, type Mood } from "@/lib/studio/music";
import CanvasVideo from "@/components/studio/canvas-video";

const PROMPT_IDEAS: Record<StudioMode, string[]> = {
  image: [
    "A neon-lit Tokyo street in the rain, cinematic, 35mm",
    "Cozy cabin in a snowy pine forest at golden hour",
    "Hyperrealistic portrait of a lion wearing a crown",
  ],
  video: [
    "Drone shot flying over turquoise ocean waves at sunrise",
    "A paper boat drifting down a rainy city gutter, slow motion",
    "Timelapse of clouds rolling over a mountain range",
  ],
  audio: [
    "Upbeat lo-fi hip hop beat with mellow piano",
    "Calm forest ambience with birds and a gentle stream",
    "Epic cinematic orchestral trailer music",
  ],
};

type Filter = "all" | "image" | "video" | "audio" | "favorites";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Last-resort fallback when an image stalls. Our primary URL is the same-origin
// proxy (/api/studio/image); if that fails we hit the upstream service directly
// (a different network path, with no serverless timeout). For an already-direct
// upstream URL we just force a faster Turbo + smaller variant.
function lightenUrl(url: string): string | null {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(url, base);

    if (u.pathname.startsWith("/api/studio/image")) {
      const prompt = u.searchParams.get("prompt") || "";
      if (!prompt) return null;
      const seed = u.searchParams.get("seed") || String(Math.floor(Math.random() * 1_000_000_000));
      const w0 = Number(u.searchParams.get("w") || "768");
      const h0 = Number(u.searchParams.get("h") || "768");
      const nw = Math.min(640, w0);
      const nh = Math.max(1, Math.round((h0 * nw) / w0));
      const p = new URLSearchParams({ width: String(nw), height: String(nh), seed, model: "turbo", nologo: "true" });
      const k = u.searchParams.get("k");
      if (k) p.set("token", k);
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${p.toString()}`;
    }

    if (u.hostname.includes("pollinations")) {
      if (u.searchParams.get("model") === "turbo" && Number(u.searchParams.get("width") || "9999") <= 640) {
        return null; // already as light as it gets
      }
      u.searchParams.set("model", "turbo");
      const w = Number(u.searchParams.get("width") || "768");
      const h = Number(u.searchParams.get("height") || "768");
      const nw = Math.min(640, w);
      u.searchParams.set("width", String(nw));
      u.searchParams.set("height", String(Math.max(1, Math.round((h * nw) / w))));
      return u.toString();
    }

    return null;
  } catch {
    return null;
  }
}

// Gallery image tile that tolerates slow / flaky Pollinations responses: retries
// the same URL a few times, then automatically falls back to a faster Turbo +
// smaller variant before offering a manual retry.
function ImageTile({ url, alt, onOpen }: { url: string; alt: string; onOpen?: () => void }) {
  const [src, setSrc] = useState(url);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [triedFallback, setTriedFallback] = useState(false);
  const retrying = state === "error" && attempt < 3;

  // Reset when the underlying creation URL changes.
  useEffect(() => {
    setSrc(url);
    setState("loading");
    setAttempt(0);
    setTriedFallback(false);
  }, [url]);

  // Auto-retry the same URL (remounts via key → Pollinations cache hit).
  useEffect(() => {
    if (!retrying) return;
    const t = setTimeout(() => {
      setState("loading");
      setAttempt((a) => a + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [retrying]);

  // After retries are exhausted, switch to the faster Turbo fallback once.
  useEffect(() => {
    if (state !== "error" || attempt < 3 || triedFallback) return;
    const fb = lightenUrl(src);
    if (fb && fb !== src) {
      setTriedFallback(true);
      setSrc(fb);
      setState("loading");
      setAttempt(0);
    }
  }, [state, attempt, triedFallback, src]);

  // Watchdog: a stalled request never fires onError, so cap the wait.
  useEffect(() => {
    if (state !== "loading") return;
    const t = setTimeout(() => setState("error"), 25000);
    return () => clearTimeout(t);
  }, [state, attempt, src]);

  return (
    <div className="relative w-full">
      {state !== "loaded" && (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-black">
          {state === "loading" || retrying ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              <span className="text-[11px] text-zinc-600">
                {triedFallback ? "Trying a faster version…" : attempt > 0 ? "Retrying…" : "Generating…"}
              </span>
            </>
          ) : (
            <button
              onClick={() => {
                setSrc(url);
                setTriedFallback(false);
                setState("loading");
                setAttempt((a) => a + 1);
              }}
              className="flex flex-col items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className="h-5 w-5" /> Tap to retry
            </button>
          )}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${src}-${attempt}`}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        onClick={onOpen}
        className={state === "loaded" ? "w-full cursor-zoom-in bg-black object-cover" : "hidden"}
      />
    </div>
  );
}

// Tile for the free "Real AI" (Hugging Face) videos. Fetches the proxy URL and
// shows the real result — a playable clip, or the server's actual error message
// (so a failed free-tier render explains itself instead of a broken player).
function HfVideoTile({ url, prompt, onMakeMotion }: { url: string; prompt?: string; onMakeMotion?: (p: string) => void }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    let obj: string | null = null;
    setState("loading");
    setMsg("");
    (async () => {
      try {
        const r = await fetch(url);
        const ct = r.headers.get("content-type") || "";
        if (r.ok && (ct.startsWith("video/") || ct.startsWith("image/"))) {
          const b = await r.blob();
          obj = URL.createObjectURL(b);
          if (alive) {
            setBlobUrl(obj);
            setState("ready");
          }
        } else {
          const t = await r.text().catch(() => "");
          if (alive) {
            setMsg(t || "Couldn't generate this video on the free tier.");
            setState("error");
          }
        }
      } catch {
        if (alive) {
          setMsg("Network error while generating.");
          setState("error");
        }
      }
    })();
    return () => {
      alive = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [url]);

  if (state === "loading") {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-black px-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        <span className="text-[11px] text-zinc-500">Generating real AI video… (can take 20–90s)</span>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-950/40 to-zinc-900 p-4 text-center">
        <Film className="h-6 w-6 text-amber-300/80" />
        <p className="text-[11px] leading-snug text-amber-200/90">{msg}</p>
        {prompt && onMakeMotion ? (
          <button
            onClick={() => onMakeMotion(prompt)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
          >
            <Wand2 className="h-3.5 w-3.5" /> Make it free with Motion
          </button>
        ) : (
          <p className="text-[11px] text-zinc-500">Tip: the free “Motion” engine always works — cinematic look + music.</p>
        )}
      </div>
    );
  }
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video src={blobUrl ?? undefined} controls loop playsInline className="aspect-video w-full bg-black object-contain" />
  );
}

// Read an uploaded file and downscale it to a compact JPEG data URI.
async function fileToDataUrl(file: File, max = 1280, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode failed"));
      i.src = dataUrl;
    });
    let { width, height } = img;
    if (width > max || height > max) {
      const scale = max / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

export default function StudioPage() {
  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<AspectRatio>("1:1");
  const [model, setModel] = useState<ImageModel>("turbo");
  const [style, setStyle] = useState("none");
  const [negative, setNegative] = useState("");
  const [batch, setBatch] = useState(1);
  const [seedInput, setSeedInput] = useState("");
  const [lockSeed, setLockSeed] = useState(false);

  const [audioStyle, setAudioStyle] = useState<AudioStyle>("music");
  const [duration, setDuration] = useState<AudioDuration>(8);

  // Free in-browser video controls.
  const [videoEngine, setVideoEngine] = useState<"free" | "pro" | "hf">("free");
  const [videoModel, setVideoModel] = useState("wan-video/wan-2.1-1.3b");
  const [motion, setMotion] = useState<Motion>("kenburns");
  const [storyShots, setStoryShots] = useState(6);
  const [cinematic, setCinematic] = useState(true);
  const [mood, setMood] = useState<Mood>("cinematic");
  const [videoDuration, setVideoDuration] = useState<VideoDuration>(4);
  const [videoImage, setVideoImage] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [gallery, setGallery] = useState<Creation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<Creation | null>(null);

  const [token, setToken] = useState("");
  const [pollToken, setPollToken] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accent, setAccent] = useState("indigo");
  const [showProfile, setShowProfile] = useState(false);

  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showHero, setShowHero] = useState(true);
  const [diag, setDiag] = useState("");
  // Server-side keys (the "Higgsfield model" — the platform holds the key so
  // visitors need no token). Populated from /api/studio/capabilities.
  const [serverCaps, setServerCaps] = useState<{ image?: boolean; video?: boolean; pro?: boolean }>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const heroFileRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = accentTheme(accent as never);

  useEffect(() => {
    setGallery(loadGallery());
    const s = loadSettings();
    setToken(s.replicateToken);
    setPollToken(s.pollinationsToken);
    setHfToken(s.hfToken);
    setName(s.name);
    setEmail(s.email);
    setAccent(s.accent || "indigo");
    if (!s.email && !s.name) setShowProfile(true);
    // Discover server-side keys so the app can be tokenless for everyone.
    fetch("/api/studio/capabilities")
      .then((r) => r.json())
      .then((c) => setServerCaps(c || {}))
      .catch(() => undefined);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  function toast(msg: string) {
    const id = newId();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  function persistSettings(
    over: Partial<{
      replicateToken: string;
      pollinationsToken: string;
      hfToken: string;
      name: string;
      email: string;
      accent: string;
    }> = {},
  ) {
    saveSettings({
      replicateToken: token.trim(),
      pollinationsToken: pollToken.trim(),
      hfToken: hfToken.trim(),
      name: name.trim(),
      email: email.trim(),
      accent,
      ...over,
    });
  }

  const authHeaders = useCallback((): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token.trim()) h["x-studio-key"] = token.trim();
    if (pollToken.trim()) h["x-pollinations-key"] = pollToken.trim();
    if (hfToken.trim()) h["x-hf-key"] = hfToken.trim();
    return h;
  }, [token, pollToken, hfToken]);

  function persistToken() {
    persistSettings({
      replicateToken: token.trim(),
      pollinationsToken: pollToken.trim(),
      hfToken: hfToken.trim(),
    });
    setShowKey(false);
    toast("Keys saved ✓");
  }

  function persistProfile() {
    persistSettings();
    setShowProfile(false);
    toast("Profile saved ✓");
  }

  function chooseAccent(a: string) {
    setAccent(a);
    persistSettings({ accent: a });
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setVideoImage(await fileToDataUrl(file));
    } catch {
      setError("Could not read that image.");
    }
  }

  // The truly-free path: jump straight into Video + free engine and open the
  // photo picker so a tap turns any photo into a motion video.
  function startPhotoToVideo() {
    setMode("video");
    setVideoEngine("free");
    setError("");
    heroFileRef.current?.click();
  }

  function animateFromGallery(c: Creation) {
    setVideoImage(c.url);
    setMode("video");
    setVideoEngine("free");
    setPrompt(c.prompt);
    setError("");
    setLightbox(null);
    toast("Loaded into the Video tab — pick a motion and Generate.");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remix(c: Creation) {
    setPrompt(c.prompt);
    if (c.ratio) setRatio(c.ratio);
    if (c.model) setModel(c.model);
    if (c.style) setStyle(c.style);
    if (c.mode === "image" || c.mode === "video" || c.mode === "audio") setMode(c.mode);
    if (c.mode === "video") {
      setVideoEngine(c.source === "free" ? "free" : "pro");
      if (c.motion) setMotion(c.motion);
    }
    if (c.audioStyle) setAudioStyle(c.audioStyle);
    setLightbox(null);
    toast("Settings loaded — tweak and Generate.");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyText(text: string, label: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
      toast(`${label} copied ✓`);
    } catch {
      toast("Couldn't copy.");
    }
  }

  async function shareCreation(c: Creation) {
    const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void> };
    if (nav.share && c.url) {
      try {
        await nav.share({ title: "Studio creation", text: c.prompt, url: c.url });
      } catch {
        /* user cancelled */
      }
    } else if (c.url) {
      copyText(c.url, "Link", `share-${c.id}`);
    } else {
      toast("This clip lives in your browser — use Export to save a file.");
    }
  }

  const save = useCallback((c: Creation) => {
    setGallery(addCreation(c));
  }, []);

  // ---- Replicate (paid) path for pro video & audio ----
  const pollJob = useCallback(
    (id: string, mediaMode: StudioMode, promptText: string, attempt = 0) => {
      pollRef.current = setTimeout(
        async () => {
          try {
            const res = await fetch(`/api/studio/generate?id=${encodeURIComponent(id)}`, {
              headers: authHeaders(),
            });
            const data = await res.json();
            if (data.status === "succeeded" && data.url) {
              setBusy(false);
              setStatus("");
              save({
                id: newId(),
                mode: mediaMode,
                source: "replicate",
                prompt: promptText,
                url: data.url,
                ratio: mediaMode === "video" ? ratio : undefined,
                audioStyle: mediaMode === "audio" ? audioStyle : undefined,
                author: name.trim() || undefined,
                createdAt: Date.now(),
              });
              return;
            }
            if (data.status === "failed" || data.error) {
              setBusy(false);
              setStatus("");
              setError(friendlyError(data.error || data.message || "Generation failed."));
              return;
            }
            if (attempt > 80) {
              setBusy(false);
              setStatus("");
              setError("This is taking too long — try again later.");
              return;
            }
            setStatus(`Rendering ${mediaMode}… (${data.status ?? "processing"})`);
            pollJob(id, mediaMode, promptText, attempt + 1);
          } catch {
            setBusy(false);
            setStatus("");
            setError("Lost connection while rendering.");
          }
        },
        attempt === 0 ? 2000 : 3000,
      );
    },
    [authHeaders, save, ratio, audioStyle, name],
  );

  function friendlyError(msg: string): string {
    if (/insufficient credit|402/i.test(msg)) {
      return "Video/audio on Replicate needs account credit. Add a card at replicate.com/account/billing, then try again. Tip: images and the free in-browser video engine cost nothing.";
    }
    if (msg === "token_missing") {
      return "That mode needs a Replicate API key — add it with the “API key” button. (Or use the free in-browser video engine instead.)";
    }
    return msg;
  }

  async function proGenerate(trimmed: string) {
    setBusy(true);
    setStatus(`Starting ${mode} render…`);
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          mode,
          prompt: trimmed,
          ratio,
          model,
          audioStyle,
          duration,
          videoModel,
          image: mode === "video" ? videoImage ?? undefined : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setBusy(false);
        setStatus("");
        setError(friendlyError(data.message || data.error || "Something went wrong."));
        if (data.error === "token_missing") setShowKey(true);
        return;
      }
      if (data.status === "succeeded" && data.url) {
        setBusy(false);
        setStatus("");
        save({
          id: newId(),
          mode,
          source: "replicate",
          prompt: trimmed,
          url: data.url,
          ratio: mode === "video" ? ratio : undefined,
          audioStyle: mode === "audio" ? audioStyle : undefined,
          author: name.trim() || undefined,
          createdAt: Date.now(),
        });
        return;
      }
      pollJob(data.id, mode, trimmed);
    } catch {
      setBusy(false);
      setStatus("");
      setError("Request failed — check your connection.");
    }
  }

  // ---- Free image generation (Pollinations) ----
  async function requestImage(finalPrompt: string, seed: number): Promise<{ url: string; seed: number }> {
    const res = await fetch("/api/studio/generate", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ mode: "image", prompt: finalPrompt, ratio, model, seed }),
    });
    const data = await res.json();
    if (data.error) throw new Error(friendlyError(data.message || data.error));
    return { url: data.url, seed: data.seed };
  }

  async function generateImages(count: number) {
    const base = prompt.trim();
    // With a style, use it; otherwise auto-expand a bare short prompt for quality.
    const styledBase = style !== "none" ? applyStyle(base, style) : expandShortPrompt(base);
    const finalPrompt = withNegative(styledBase, negative);
    const created: Creation[] = [];
    for (let i = 0; i < count; i++) {
      setStatus(count > 1 ? `Generating image ${i + 1} of ${count}…` : "Generating image…");
      const baseSeed = lockSeed && seedInput ? Number(seedInput) : Math.floor(Math.random() * 1_000_000_000);
      const { url, seed } = await requestImage(finalPrompt, baseSeed + i);
      created.push({
        id: newId(),
        mode: "image",
        prompt: base,
        url,
        ratio,
        model,
        style: style !== "none" ? style : undefined,
        seed,
        author: name.trim() || undefined,
        createdAt: Date.now() + i,
      });
    }
    setGallery(addCreations(created));
    toast(count > 1 ? `${count} images added ✓` : "Image added ✓");
  }

  async function generateFreeVideo() {
    const base = prompt.trim();
    const isStory = motion === "morph" && !videoImage;
    let images: string[];
    let durationMs = videoDuration * 1000;

    if (videoImage) {
      images = [videoImage];
    } else if (isStory) {
      // Free text-to-video: a cinematic storyboard of keyframes for one scene.
      // A single fixed seed keeps the scene consistent across the shots.
      const shots = buildStoryboard(base, storyShots);
      const seed = Math.floor(Math.random() * 1_000_000_000);
      images = [];
      for (let i = 0; i < shots.length; i++) {
        setStatus(`Filming shot ${i + 1} of ${shots.length}…`);
        const framePrompt = style !== "none" ? applyStyle(shots[i], style) : shots[i];
        const { url } = await requestImage(framePrompt, seed);
        images.push(url);
      }
      durationMs = storyShots * 1100; // ~1.1s per shot
    } else {
      const styled = style !== "none" ? applyStyle(base, style) : expandShortPrompt(base);
      setStatus("Rendering the frame…");
      const { url } = await requestImage(styled, Math.floor(Math.random() * 1_000_000_000));
      images = [url];
    }

    save({
      id: newId(),
      mode: "video",
      source: "free",
      prompt: base || "Animated image",
      url: "",
      images,
      motion,
      durationMs,
      fps: 30,
      ratio,
      cinematic,
      mood: mood !== "none" ? mood : undefined,
      style: style !== "none" ? style : undefined,
      author: name.trim() || undefined,
      createdAt: Date.now(),
    });
    toast(
      isStory
        ? "🎬 Your AI video is ready — it loops below. Tap Export to save the file."
        : "Video ready — it loops live below. Tap Export to save a file.",
    );
  }

  // One-tap recovery when a paid/HF real-AI video fails: make a real cinematic
  // clip from the same prompt with the always-free Motion engine.
  async function makeMotionVideo(basePrompt: string) {
    if (busy) return;
    setMode("video");
    setVideoEngine("free");
    setMotion("morph");
    setVideoImage(null);
    setPrompt(basePrompt);
    setError("");
    setBusy(true);
    try {
      const shots = buildStoryboard(basePrompt, storyShots);
      const seed = Math.floor(Math.random() * 1_000_000_000);
      const images: string[] = [];
      for (let i = 0; i < shots.length; i++) {
        setStatus(`Filming shot ${i + 1} of ${shots.length}…`);
        const framePrompt = style !== "none" ? applyStyle(shots[i], style) : shots[i];
        const { url } = await requestImage(framePrompt, seed);
        images.push(url);
      }
      save({
        id: newId(),
        mode: "video",
        source: "free",
        prompt: basePrompt,
        url: "",
        images,
        motion: "morph",
        durationMs: storyShots * 1100,
        fps: 30,
        ratio,
        cinematic,
        mood: mood !== "none" ? mood : undefined,
        style: style !== "none" ? style : undefined,
        author: name.trim() || undefined,
        createdAt: Date.now(),
      });
      toast("🎬 Made it with the free Motion engine ✓");
      if (typeof window !== "undefined") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't make the Motion video.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function generate() {
    const trimmed = prompt.trim();
    if (busy) return;
    const needsPrompt = !(mode === "video" && videoEngine === "free" && videoImage);
    if (needsPrompt && !trimmed) return;
    setError("");

    if (mode === "image") {
      setBusy(true);
      try {
        await generateImages(batch);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Image generation failed.");
      } finally {
        setBusy(false);
        setStatus("");
      }
      return;
    }

    if (mode === "video" && videoEngine === "free") {
      setBusy(true);
      try {
        await generateFreeVideo();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Video generation failed.");
      } finally {
        setBusy(false);
        setStatus("");
      }
      return;
    }

    if (mode === "video" && videoEngine === "hf") {
      generateHfVideo(trimmed);
      return;
    }

    // Pro (Replicate) video / audio.
    proGenerate(trimmed);
  }

  // Real free AI video via Hugging Face (through our /api/studio/video proxy).
  // The <video> element loads the URL, which generates + streams on demand.
  function generateHfVideo(trimmed: string) {
    // Keyless: the server first tries public HF Spaces (no token). A token, if
    // present, just unlocks the hf-inference fallback too.
    const params = new URLSearchParams({ prompt: trimmed });
    if (hfToken.trim()) params.set("hf", hfToken.trim());
    save({
      id: newId(),
      mode: "video",
      source: "replicate",
      prompt: trimmed,
      url: `/api/studio/video?${params.toString()}`,
      ratio,
      author: name.trim() || undefined,
      createdAt: Date.now(),
    });
    toast("🎬 Rendering a real AI video (LTX/CogVideoX) — it appears below and can take ~30–120s.");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
  }

  function doExportGallery() {
    try {
      const blob = new Blob([exportGalleryJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studio-gallery-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast("Gallery exported ✓");
    } catch {
      toast("Couldn't export the gallery.");
    }
  }

  async function onImportGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setGallery(importGalleryJSON(text));
      toast("Gallery imported ✓");
    } catch {
      toast("That doesn't look like a gallery export.");
    }
  }

  const recentPrompts = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of gallery) {
      const p = c.prompt?.trim();
      if (p && !seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [gallery]);

  const favCount = useMemo(() => gallery.filter((c) => c.favorite).length, [gallery]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return gallery.filter((c) => {
      if (filter === "favorites" && !c.favorite) return false;
      if (filter !== "all" && filter !== "favorites" && c.mode !== filter) return false;
      if (q && !c.prompt.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [gallery, filter, search]);

  const tabBtn = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active ? `${theme.solid} text-white` : "text-zinc-400 hover:text-zinc-200"
    }`;

  const filterBtn = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      active ? `${theme.solid} text-white` : "border border-zinc-700 text-zinc-400 hover:text-zinc-200"
    }`;

  const showAspect = mode === "image" || (mode === "video" && (videoEngine === "free" || !videoImage));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-8">
      {/* Always-available picker so the hero CTA can open it in one tap */}
      <input ref={heroFileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />

      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/studio-icon.svg"
          alt="Studio"
          width={40}
          height={40}
          className={`h-10 w-10 rounded-xl shadow-lg ${theme.shadow}`}
        />
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Studio</h1>
          <p className="text-sm text-zinc-400">
            {name || email ? `Welcome back, ${name || email}` : "Generate images, video & audio from a prompt"}
          </p>
        </div>
        <button
          onClick={() => setShowProfile((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            email || name ? `border-zinc-700 ${theme.text} hover:bg-zinc-800` : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
          title="Your profile & appearance"
        >
          <User className="h-3.5 w-3.5" />
          {email || name ? "Profile" : "Sign in"}
        </button>
        <button
          onClick={() => setShowKey((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            token.trim() ? "border-emerald-700 text-emerald-300 hover:bg-emerald-950/40" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
          title="Set your Replicate API key (optional — only for pro video & audio)"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {token.trim() ? "Key set" : "API key"}
        </button>
      </header>

      {/* Profile & appearance */}
      {showProfile && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="mb-1 block text-xs font-medium text-zinc-300">Your profile</label>
          <p className="mb-3 text-xs text-zinc-500">
            Saved only in this browser — no account, no password. Personalizes the app and sits alongside your
            gallery and API key.
          </p>
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
          <div className="mt-3">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Palette className="h-3.5 w-3.5" /> Accent
            </span>
            <div className="flex flex-wrap gap-2">
              {ACCENT_THEMES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => chooseAccent(a.value)}
                  title={a.label}
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${a.gradient} ring-2 ring-offset-2 ring-offset-zinc-900 ${
                    accent === a.value ? "ring-white" : "ring-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={persistProfile} className={`rounded-md ${theme.solid} px-4 py-2 text-sm font-medium text-white hover:opacity-90`}>
              Save
            </button>
            {(email || name) && (
              <button
                onClick={() => {
                  setName("");
                  setEmail("");
                  persistSettings({ name: "", email: "" });
                  toast("Profile cleared");
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* API key panel */}
      {showKey && (
        <div className="mb-4 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          {/* Hugging Face token — free, most reliable images */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Hugging Face token <span className="text-emerald-400">(free — most reliable images)</span>
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              The most reliable free image engine (FLUX). Create a free token at{" "}
              <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                huggingface.co/settings/tokens
              </a>{" "}
              (type &ldquo;Read&rdquo;), then paste it here. Stored only in this browser.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder="hf_…"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              {hfToken.trim() && (
                <button
                  onClick={() => {
                    setHfToken("");
                    persistSettings({ hfToken: "" });
                    toast("Hugging Face token cleared");
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Pollinations token — free, fallback */}
          <div className="border-t border-zinc-800 pt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Pollinations token <span className="text-zinc-500">(optional fallback)</span>
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              A second free image source. Sign in at{" "}
              <a href="https://auth.pollinations.ai" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                auth.pollinations.ai
              </a>{" "}
              and paste the token here.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={pollToken}
                onChange={(e) => setPollToken(e.target.value)}
                placeholder="pollinations token…"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              {pollToken.trim() && (
                <button
                  onClick={() => {
                    setPollToken("");
                    persistSettings({ pollinationsToken: "" });
                    toast("Pollinations token cleared");
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Replicate token — paid, for pro video/audio */}
          <div className="border-t border-zinc-800 pt-3">
            <label className="mb-1 block text-xs font-medium text-zinc-300">Replicate API token (optional, paid)</label>
            <p className="mb-2 text-xs text-zinc-500">
              Only for the <strong>pro</strong> video/audio models (they cost credit). Images and the free
              in-browser video engine don&apos;t need this. Get one at{" "}
              <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                replicate.com/account/api-tokens
              </a>
              .
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="r8_..."
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              {token.trim() && (
                <button
                  onClick={() => {
                    setToken("");
                    persistSettings({ replicateToken: "" });
                    toast("Replicate key cleared");
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={persistToken} className={`rounded-md ${theme.solid} px-4 py-2 text-sm font-medium text-white hover:opacity-90`}>
              Save keys
            </button>
            <button
              onClick={async () => {
                setDiag("Testing…");
                try {
                  const r = await fetch("/api/studio/image?prompt=a+red+apple&debug=1", { headers: authHeaders() });
                  const j = await r.json();
                  setDiag(JSON.stringify(j, null, 2));
                } catch (e) {
                  setDiag("Test failed: " + String(e));
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Test image service
            </button>
          </div>
          {diag && (
            <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 text-[11px] leading-snug text-zinc-300">
              {diag}
            </pre>
          )}
        </div>
      )}

      {/* Hero: the 100%-free photo → video flow, front and centre */}
      {showHero && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/50 to-zinc-900/40 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/20 p-2.5">
              <Film className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-emerald-100">Free AI video from text ✨</h2>
              <p className="mt-0.5 text-xs text-emerald-200/70">
                Type a scene and get a real cinematic clip — built from AI keyframes right on your phone, then export
                the file. No paid API, no Replicate credit. Or animate your own photo.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setMode("video");
                    setVideoEngine("free");
                    setMotion("morph");
                    setVideoImage(null);
                    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
                >
                  <Film className="h-4 w-4" /> Make an AI video from text
                </button>
                <button
                  onClick={startPhotoToVideo}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/60 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-900/30"
                >
                  <ImagePlus className="h-4 w-4" /> Animate a photo
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowHero(false)}
              className="shrink-0 rounded-md p-1 text-emerald-300/60 hover:bg-emerald-900/40 hover:text-emerald-200"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mode switch */}
      <div className="mb-4 flex gap-1 rounded-xl bg-zinc-900 p-1">
        <button className={tabBtn(mode === "image")} onClick={() => setMode("image")}>
          <ImageIcon className="h-4 w-4" /> Image
        </button>
        <button className={tabBtn(mode === "video")} onClick={() => setMode("video")}>
          <Video className="h-4 w-4" /> Video
        </button>
        <button className={tabBtn(mode === "audio")} onClick={() => setMode("audio")}>
          <Music className="h-4 w-4" /> Audio
        </button>
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            mode === "image"
              ? "Describe the image you want to create…"
              : mode === "video"
                ? videoImage
                  ? "Describe how the image should move (or just pick a motion below)…"
                  : "Describe the scene — the free engine turns it into a looping motion video…"
                : "Describe the music, ambience or sound you want…"
          }
          rows={3}
          className="w-full resize-none bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />

        {/* Prompt tools */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPrompt((p) => enhancePrompt(p) || p)}
            disabled={!prompt.trim()}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
            title="Add quality boosters to your prompt"
          >
            <Sparkles className="h-3.5 w-3.5" /> Enhance
          </button>
          <button
            onClick={() => setPrompt(randomPrompt())}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500"
            title="Surprise me with a random idea"
          >
            <Shuffle className="h-3.5 w-3.5" /> Surprise me
          </button>
          {prompt && (
            <button
              onClick={() => setPrompt("")}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Video engine toggle */}
        {mode === "video" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
            <span className="px-1 text-xs text-zinc-500">Engine</span>
            <button
              onClick={() => setVideoEngine("hf")}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${videoEngine === "hf" ? `${theme.solid} text-white` : "text-zinc-400 hover:text-zinc-200"}`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Real AI (free)
            </button>
            <button
              onClick={() => setVideoEngine("free")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${videoEngine === "free" ? `${theme.solid} text-white` : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Motion (free)
            </button>
            <button
              onClick={() => setVideoEngine("pro")}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${videoEngine === "pro" ? `${theme.solid} text-white` : "text-zinc-400 hover:text-zinc-200"}`}
            >
              <Film className="h-3.5 w-3.5" /> Pro (Replicate)
            </button>
            <span className="ml-auto px-1 text-[11px] text-zinc-500">
              {videoEngine === "hf"
                ? serverCaps.video
                  ? "Real generated video · powered · no token needed ✨"
                  : "Real generated video · LTX / CogVideoX · free HF token"
                : videoEngine === "free"
                  ? "No key · loops + export"
                  : serverCaps.pro
                    ? "Powered · no token needed ✨"
                    : "Needs Replicate credit"}
            </span>
          </div>
        )}

        {/* Image-to-video / animate: attach a still */}
        {mode === "video" && videoEngine !== "hf" && (
          <div className="mt-3">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            {videoImage ? (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900/60 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={videoImage} alt="source" className="h-14 w-14 rounded-md object-cover" />
                <div className="flex-1 text-xs text-zinc-400">
                  <p className="font-medium text-zinc-200">Image attached</p>
                  <p>{videoEngine === "free" ? "It will be animated with the motion below." : "It will be animated by the prompt above."}</p>
                </div>
                <button
                  onClick={() => setVideoImage(null)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
              >
                <ImagePlus className="h-4 w-4" /> Add an image to animate (optional)
              </button>
            )}
          </div>
        )}

        {/* Style presets (image + free video) */}
        {(mode === "image" || (mode === "video" && videoEngine === "free")) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STYLE_PRESETS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  style === s.id ? `${theme.solid} text-white` : "border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Prompt ideas + recents */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMPT_IDEAS[mode].map((idea) => (
            <button
              key={idea}
              onClick={() => setPrompt(idea)}
              className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
            >
              {idea.length > 34 ? idea.slice(0, 34) + "…" : idea}
            </button>
          ))}
        </div>
        {recentPrompts.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-600">Recent:</span>
            {recentPrompts.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="rounded-full bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {p.length > 28 ? p.slice(0, 28) + "…" : p}
              </button>
            ))}
          </div>
        )}

        {/* Options row */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
          {showAspect && (
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Aspect
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value as AspectRatio)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === "image" && (
            <>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Model
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ImageModel)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                >
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Count
                <select
                  value={batch}
                  onChange={(e) => setBatch(Number(e.target.value))}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "image" : "images"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
              >
                {showAdvanced ? "Hide advanced" : "Advanced"}
              </button>
            </>
          )}

          {mode === "video" && videoEngine === "pro" && !videoImage && (
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Quality
              <select
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
              >
                {PRO_VIDEO_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === "video" && videoEngine === "free" && (
            <>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Motion
                <select
                  value={motion}
                  onChange={(e) => setMotion(e.target.value as Motion)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                >
                  {MOTION_PRESETS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              {motion !== "morph" && (
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  Length
                  <select
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(Number(e.target.value) as VideoDuration)}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                  >
                    {VIDEO_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {motion === "morph" && !videoImage && (
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  Shots
                  <select
                    value={storyShots}
                    onChange={(e) => setStoryShots(Number(e.target.value))}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                  >
                    {STORY_SHOTS.map((n) => (
                      <option key={n} value={n}>
                        {n} shots
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Music
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value as Mood)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                >
                  {MUSIC_MOODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={cinematic} onChange={(e) => setCinematic(e.target.checked)} className="accent-indigo-500" />
                Cinematic look 🎬
              </label>
            </>
          )}

          {mode === "audio" && (
            <>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Type
                <select
                  value={audioStyle}
                  onChange={(e) => setAudioStyle(e.target.value as AudioStyle)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                >
                  {AUDIO_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Length
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) as AudioDuration)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                >
                  {AUDIO_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}s
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <button
            onClick={generate}
            disabled={busy}
            className={`ml-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-br ${theme.gradient} px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? "Working…" : "Generate"}
          </button>
        </div>

        {/* Advanced (image): negative prompt + seed */}
        {mode === "image" && showAdvanced && (
          <div className="mt-3 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Negative prompt (what to avoid)</label>
              <input
                value={negative}
                onChange={(e) => setNegative(e.target.value)}
                placeholder="blurry, text, watermark, extra fingers…"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Seed
                <input
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="random"
                  className="w-28 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={lockSeed} onChange={(e) => setLockSeed(e.target.checked)} className="accent-indigo-500" />
                Lock seed (reproducible)
              </label>
              <button onClick={() => setSeedInput(String(Math.floor(Math.random() * 1_000_000_000)))} className="text-xs text-zinc-500 hover:text-zinc-300">
                Randomize
              </button>
            </div>
          </div>
        )}
      </div>

      {status && (
        <p className="mt-3 flex items-center gap-2 text-sm text-indigo-300">
          <Loader2 className="h-4 w-4 animate-spin" /> {status}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
      {(mode === "image" || (mode === "video" && videoEngine === "free")) &&
        !hfToken.trim() &&
        !pollToken.trim() &&
        !serverCaps.image && (
          <p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
            Heads up: the keyless image service is heavily rate-limited now, so images can be slow or fail.{" "}
            <button onClick={() => setShowKey(true)} className="underline underline-offset-2">
              Add a free Hugging Face token
            </button>{" "}
            for fast, reliable images.
          </p>
        )}
      {serverCaps.image && !hfToken.trim() && (
        <p className="mt-3 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200/90">
          ✨ This app is powered — image{serverCaps.video ? " & AI video" : ""} generation works with no token needed.
        </p>
      )}

      {/* Gallery */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-300">
            Your creations {gallery.length > 0 && `(${gallery.length}${favCount ? ` · ${favCount}★` : ""})`}
          </h2>
          <div className="flex items-center gap-3">
            <input ref={importInputRef} type="file" accept="application/json" onChange={onImportGallery} className="hidden" />
            {gallery.length > 0 && (
              <button onClick={doExportGallery} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300" title="Export gallery as JSON">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            )}
            <button onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300" title="Import a gallery export">
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            {gallery.length > 0 && (
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.confirm("Clear all creations? This can't be undone.")) {
                    setGallery(clearGallery());
                    toast("Gallery cleared");
                  }
                }}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filters + search */}
        {gallery.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["all", "image", "video", "audio", "favorites"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={filterBtn(filter === f)}>
                {f === "favorites" ? "★ Favorites" : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts…"
                className="w-44 rounded-full border border-zinc-700 bg-zinc-900 py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">
            Nothing yet — write a prompt above and hit Generate.
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">
            No creations match your filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visible.map((c) => (
              <figure key={c.id} className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
                {c.mode === "video" && c.source === "free" && c.images?.length ? (
                  <CanvasVideo
                    images={c.images}
                    motion={c.motion ?? "kenburns"}
                    durationMs={c.durationMs ?? 4000}
                    ratio={c.ratio}
                    fps={c.fps ?? 30}
                    cinematic={c.cinematic ?? false}
                    mood={(c.mood as Mood) ?? "none"}
                    onToast={toast}
                  />
                ) : c.mode === "video" && c.url.startsWith("/api/studio/video") ? (
                  <HfVideoTile url={c.url} prompt={c.prompt} onMakeMotion={makeMotionVideo} />
                ) : c.mode === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={c.url} controls loop className="aspect-video w-full bg-black object-cover" />
                ) : c.mode === "audio" ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-950 to-fuchsia-950 p-4">
                    <Music className="h-8 w-8 text-fuchsia-300" />
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio src={c.url} controls className="w-full" />
                  </div>
                ) : (
                  <ImageTile url={c.url} alt={c.prompt} onOpen={() => setLightbox(c)} />
                )}

                <figcaption className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs text-zinc-400">{c.prompt}</p>
                      {c.author && <p className="mt-1 truncate text-[11px] text-zinc-600">by {c.author}</p>}
                    </div>
                    <button
                      onClick={() => setGallery(toggleFavorite(c.id))}
                      className={`shrink-0 rounded-md p-1.5 hover:bg-zinc-800 ${c.favorite ? "text-rose-400" : "text-zinc-500 hover:text-rose-300"}`}
                      title={c.favorite ? "Unfavorite" : "Favorite"}
                    >
                      <Heart className={`h-4 w-4 ${c.favorite ? "fill-current" : ""}`} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {c.mode === "image" && (
                      <button onClick={() => animateFromGallery(c)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-indigo-300" title="Animate into a video">
                        <Clapperboard className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => remix(c)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="Remix (load settings)">
                      <Repeat2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => copyText(c.prompt, "Prompt", `p-${c.id}`)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="Copy prompt">
                      {copied === `p-${c.id}` ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    {c.url && (
                      <button onClick={() => shareCreation(c)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="Share">
                        <Share2 className="h-4 w-4" />
                      </button>
                    )}
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" download className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="Open / download">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    {c.mode === "image" && (
                      <button onClick={() => setLightbox(c)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="View fullscreen">
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setGallery(removeCreation(c.id))} className="ml-auto rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 backdrop-blur" onClick={() => setLightbox(null)}>
          <div className="flex justify-end">
            <button onClick={() => setLightbox(null)} className="rounded-full bg-zinc-800/80 p-2 text-zinc-200 hover:bg-zinc-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.prompt} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-3 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="w-full text-sm text-zinc-300">{lightbox.prompt}</p>
            <button onClick={() => remix(lightbox)} className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              <Repeat2 className="h-3.5 w-3.5" /> Remix
            </button>
            <button onClick={() => animateFromGallery(lightbox)} className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              <Clapperboard className="h-3.5 w-3.5" /> Animate
            </button>
            <a href={lightbox.url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto max-w-sm rounded-full bg-zinc-800/95 px-4 py-2 text-center text-sm text-zinc-100 shadow-lg ring-1 ring-white/10">
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
