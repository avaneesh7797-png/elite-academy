"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Download,
  ImageIcon,
  ImagePlus,
  KeyRound,
  Loader2,
  Music,
  RefreshCw,
  Trash2,
  User,
  Video,
  Wand2,
  X,
} from "lucide-react";
import {
  ASPECT_RATIOS,
  AUDIO_DURATIONS,
  AUDIO_STYLES,
  IMAGE_MODELS,
  type AspectRatio,
  type AudioDuration,
  type AudioStyle,
  type ImageModel,
  type StudioMode,
} from "@/lib/studio/types";
import {
  addCreation,
  clearGallery,
  loadGallery,
  loadSettings,
  removeCreation,
  saveSettings,
  type Creation,
} from "@/lib/studio/storage";

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

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Gallery image tile that tolerates slow / flaky Pollinations responses:
// shows a spinner while loading, auto-retries a few times on error (with a
// cache-busting param), then offers a manual retry instead of a broken icon.
function ImageTile({ url, alt }: { url: string; alt: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const src = attempt > 0 ? `${url}${url.includes("?") ? "&" : "?"}retry=${attempt}` : url;
  const retrying = state === "error" && attempt < 3;

  useEffect(() => {
    if (!retrying) return;
    const t = setTimeout(() => {
      setState("loading");
      setAttempt((a) => a + 1);
    }, 2500);
    return () => clearTimeout(t);
  }, [retrying]);

  return (
    <div className="relative w-full">
      {state !== "loaded" && (
        <div className="flex aspect-square w-full items-center justify-center bg-black">
          {state === "loading" || retrying ? (
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          ) : (
            <button
              onClick={() => {
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
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={state === "loaded" ? "w-full bg-black object-cover" : "hidden"}
      />
    </div>
  );
}

// Read an uploaded file and downscale it to a compact JPEG data URI so the
// upload stays well under serverless body limits before going to Replicate.
async function fileToDataUrl(file: File, max = 1024, quality = 0.85): Promise<string> {
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
  const [model, setModel] = useState<ImageModel>("flux");
  const [audioStyle, setAudioStyle] = useState<AudioStyle>("music");
  const [duration, setDuration] = useState<AudioDuration>(8);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [gallery, setGallery] = useState<Creation[]>([]);
  const [token, setToken] = useState("");
  const [showKey, setShowKey] = useState(false);
  // Local profile — remembered in this browser (no account, no backend).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  // Source still for image-to-video (data URI from upload, or a gallery image URL).
  const [videoImage, setVideoImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGallery(loadGallery());
    const s = loadSettings();
    setToken(s.replicateToken);
    setName(s.name);
    setEmail(s.email);
    // Prompt for a profile on first visit if nothing is saved yet.
    if (!s.email && !s.name) setShowProfile(true);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // Persist all settings together so saving one field never clobbers the others.
  function persistSettings(over: Partial<{ replicateToken: string; name: string; email: string }> = {}) {
    saveSettings({
      replicateToken: token.trim(),
      name: name.trim(),
      email: email.trim(),
      ...over,
    });
  }

  const authHeaders = useCallback((): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token.trim()) h["x-studio-key"] = token.trim();
    return h;
  }, [token]);

  const save = useCallback((c: Creation) => {
    setGallery(addCreation(c));
  }, []);

  function persistToken() {
    persistSettings({ replicateToken: token.trim() });
    setShowKey(false);
  }

  function persistProfile() {
    persistSettings();
    setShowProfile(false);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      setVideoImage(await fileToDataUrl(file));
    } catch {
      setError("Could not read that image.");
    }
  }

  // Send an image you already generated straight into the Video tab to animate it.
  function animateFromGallery(url: string) {
    setVideoImage(url);
    setMode("video");
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
              setError(data.error || data.message || "Generation failed.");
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
    [authHeaders, save, ratio, audioStyle],
  );

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setError("");
    setBusy(true);
    setStatus(mode === "image" ? "Generating image…" : `Starting ${mode} render…`);

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
          image: mode === "video" ? videoImage ?? undefined : undefined,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setBusy(false);
        setStatus("");
        setError(data.message || "Something went wrong.");
        if (data.error === "token_missing") setShowKey(true);
        return;
      }

      if (data.kind === "image") {
        // Save immediately; the gallery tile renders a spinner and retries
        // while the (sometimes slow) image URL loads.
        setBusy(false);
        setStatus("");
        save({
          id: newId(),
          mode: "image",
          prompt: trimmed,
          url: data.url,
          ratio,
          model,
          seed: data.seed,
          author: name.trim() || undefined,
          createdAt: Date.now(),
        });
        return;
      }

      // video or audio job
      if (data.status === "succeeded" && data.url) {
        setBusy(false);
        setStatus("");
        save({
          id: newId(),
          mode,
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

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
  }

  const tabBtn = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"
    }`;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8">
      <header className="mb-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/studio-icon.svg"
          alt="Studio"
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl shadow-lg shadow-fuchsia-500/20"
        />
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Studio</h1>
          <p className="text-sm text-zinc-400">
            {name || email
              ? `Welcome back, ${name || email}`
              : "Generate images, video & audio from a prompt"}
          </p>
        </div>
        <button
          onClick={() => setShowProfile((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            email || name
              ? "border-indigo-700 text-indigo-300 hover:bg-indigo-950/40"
              : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
          title="Your profile (remembered on this device)"
        >
          <User className="h-3.5 w-3.5" />
          {email || name ? "Profile" : "Sign in"}
        </button>
        <button
          onClick={() => setShowKey((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            token.trim()
              ? "border-emerald-700 text-emerald-300 hover:bg-emerald-950/40"
              : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
          title="Set your Replicate API key (needed for video & audio)"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {token.trim() ? "Key set" : "API key"}
        </button>
      </header>

      {/* Profile panel — remembered locally in this browser */}
      {showProfile && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="mb-1 block text-xs font-medium text-zinc-300">Your profile</label>
          <p className="mb-3 text-xs text-zinc-500">
            Saved only in this browser — no account, no password. It personalizes the app and
            sits alongside your API key and gallery (which are also kept on this device).
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
          <div className="mt-3 flex gap-2">
            <button
              onClick={persistProfile}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Save
            </button>
            {(email || name) && (
              <button
                onClick={() => {
                  setName("");
                  setEmail("");
                  persistSettings({ name: "", email: "" });
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
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="mb-1 block text-xs font-medium text-zinc-300">Replicate API token</label>
          <p className="mb-2 text-xs text-zinc-500">
            Needed for video &amp; audio only — images are free. Get one at{" "}
            <a
              href="https://replicate.com/account/api-tokens"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 underline"
            >
              replicate.com/account/api-tokens
            </a>
            . Stored only in this browser and sent with your requests.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="r8_..."
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              onClick={persistToken}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Save
            </button>
            {token.trim() && (
              <button
                onClick={() => {
                  setToken("");
                  persistSettings({ replicateToken: "" });
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-red-400"
              >
                Clear
              </button>
            )}
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

      {/* Prompt box */}
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
                  ? "Describe how the image should move or animate…"
                  : "Describe the video scene — or add an image below to animate it…"
                : "Describe the music, ambience or sound you want…"
          }
          rows={3}
          className="w-full resize-none bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />

        {/* Image-to-video: attach a still to animate */}
        {mode === "video" && (
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />
            {videoImage ? (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900/60 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={videoImage} alt="source" className="h-14 w-14 rounded-md object-cover" />
                <div className="flex-1 text-xs text-zinc-400">
                  <p className="font-medium text-zinc-200">Image attached</p>
                  <p>It will be animated using your prompt above.</p>
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
                <ImagePlus className="h-4 w-4" /> Add an image to animate (image → video)
              </button>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
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

        {/* Options */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
          {(mode === "image" || (mode === "video" && !videoImage)) && (
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
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Style
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
            disabled={busy || !prompt.trim()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? "Working…" : "Generate"}
          </button>
        </div>
      </div>

      {status && (
        <p className="mt-3 flex items-center gap-2 text-sm text-indigo-300">
          <Loader2 className="h-4 w-4 animate-spin" /> {status}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Gallery */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">
            Your creations {gallery.length > 0 && `(${gallery.length})`}
          </h2>
          {gallery.length > 0 && (
            <button
              onClick={() => setGallery(clearGallery())}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              Clear all
            </button>
          )}
        </div>

        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">
            Nothing yet — write a prompt above and hit Generate.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {gallery.map((c) => (
              <figure
                key={c.id}
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
              >
                {c.mode === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={c.url} controls loop className="aspect-video w-full bg-black object-cover" />
                ) : c.mode === "audio" ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-950 to-fuchsia-950 p-4">
                    <Music className="h-8 w-8 text-fuchsia-300" />
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio src={c.url} controls className="w-full" />
                  </div>
                ) : (
                  <ImageTile url={c.url} alt={c.prompt} />
                )}
                <figcaption className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs text-zinc-400">{c.prompt}</p>
                    {c.author && (
                      <p className="mt-1 truncate text-[11px] text-zinc-600">by {c.author}</p>
                    )}
                  </div>
                  {c.mode === "image" && (
                    <button
                      onClick={() => animateFromGallery(c.url)}
                      className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-indigo-300"
                      title="Animate this image into a video"
                    >
                      <Clapperboard className="h-4 w-4" />
                    </button>
                  )}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                    title="Open / download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setGallery(removeCreation(c.id))}
                    className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
