"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Music, Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  dimsForRatio,
  drawMotionFrame,
  exportSupported,
  loadImage,
  recordMotionVideo,
} from "@/lib/studio/video-engine";
import { startMood, type Mood, type MusicHandle } from "@/lib/studio/music";
import type { Motion } from "@/lib/studio/types";

type Props = {
  images: string[];
  motion: Motion;
  durationMs?: number;
  ratio?: string;
  fps?: number;
  cinematic?: boolean;
  mood?: Mood;
  onToast?: (msg: string) => void;
};

// A free, in-browser "video": animates the source image(s) live on a looping
// canvas (optional cinematic film look), with a generated soundtrack and an
// export-to-file button (music muxed in when the browser supports it).
export default function CanvasVideo({
  images,
  motion,
  durationMs = 4000,
  ratio,
  fps = 30,
  cinematic = false,
  mood = "none",
  onToast,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgsRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const playingRef = useRef<boolean>(true);
  const musicRef = useRef<MusicHandle | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const { W, H } = dimsForRatio(ratio);
  const key = images.join("|");

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Stop any music when the component unmounts.
  useEffect(() => {
    return () => {
      musicRef.current?.stop();
      musicRef.current = null;
    };
  }, []);

  // Load the frame images for display (no crossOrigin → max compatibility).
  //
  // Resilient on purpose: a single stalled frame used to hang the whole clip on
  // "Preparing motion…" forever (Promise.all never settles). Now each frame has
  // its own timeout, failures are skipped, and we play with whatever loaded.
  useEffect(() => {
    let alive = true;
    setReady(false);
    setFailed(false);
    setLoaded(0);

    const withTimeout = (src: string) =>
      Promise.race([
        loadImage(src, false),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 30000)),
      ])
        .then((img) => {
          if (alive) setLoaded((c) => c + 1);
          return img as HTMLImageElement;
        })
        .catch(() => null);

    Promise.all(images.map(withTimeout)).then((results) => {
      if (!alive) return;
      const ok = results.filter((r): r is HTMLImageElement => !!r);
      if (!ok.length) {
        setFailed(true);
        return;
      }
      imgsRef.current = ok;
      setReady(true);
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Animation loop.
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;
    startRef.current = performance.now() - lastTRef.current * durationMs;

    const loop = (now: number) => {
      if (playingRef.current) {
        lastTRef.current = ((now - startRef.current) % durationMs) / durationMs;
      } else {
        startRef.current = now - lastTRef.current * durationMs;
      }
      try {
        drawMotionFrame(ctx, imgsRef.current, motion, lastTRef.current, W, H, cinematic);
      } catch {
        /* ignore transient draw errors */
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, motion, durationMs, W, H, cinematic]);

  function toggleMusic() {
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
      setMusicOn(false);
      return;
    }
    const h = startMood(mood, { toSpeakers: true });
    if (h) {
      musicRef.current = h;
      setMusicOn(true);
    } else {
      onToast?.("Music isn't supported on this browser.");
    }
  }

  async function doExport() {
    if (exporting) return;
    if (!exportSupported()) {
      onToast?.("This browser can't export video files — but it plays here. Try Chrome or Android.");
      return;
    }
    setExporting(true);
    setProgress(0);
    // Build a silent-to-speakers music stream to mux into the file.
    let music: MusicHandle | null = null;
    if (mood !== "none") music = startMood(mood, { toSpeakers: false });
    try {
      // Reload remote frames with CORS so the recording canvas isn't tainted.
      let exImgs: HTMLImageElement[];
      try {
        exImgs = await Promise.all(images.map((s) => loadImage(s, !s.startsWith("data:"))));
      } catch {
        exImgs = imgsRef.current;
      }
      const blob = await recordMotionVideo({
        imgs: exImgs,
        motion,
        W,
        H,
        durationMs,
        fps,
        cinematic,
        audioStream: music?.stream ?? null,
        onProgress: setProgress,
      });
      if (!blob) {
        onToast?.("Couldn't export on this browser — the live preview still works. Try Chrome/Android.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studio-video-${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      onToast?.(mood !== "none" ? "Video exported with music ✓" : "Video file exported ✓");
    } catch {
      onToast?.("Couldn't export this video.");
    } finally {
      music?.stop();
      setExporting(false);
      setProgress(0);
    }
  }

  return (
    <div className="relative w-full bg-black">
      {failed ? (
        <div className="flex aspect-video w-full items-center justify-center bg-black px-4 text-center text-xs text-zinc-500">
          Couldn&apos;t load the source frame(s) for this clip.
        </div>
      ) : !ready ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-black px-6">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          <span className="text-[11px] text-zinc-500">
            Loading frames {loaded}/{images.length}…
          </span>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${images.length ? (loaded / images.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="block w-full" />
      )}

      {ready && !failed && (
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300 backdrop-blur">
          {cinematic ? "● Cinematic" : "● Live preview"}
        </span>
      )}

      {ready && !failed && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="rounded-full bg-black/60 p-2 text-zinc-200 backdrop-blur hover:bg-black/80"
            title={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          {mood !== "none" && (
            <button
              onClick={toggleMusic}
              className="rounded-full bg-black/60 p-2 text-zinc-200 backdrop-blur hover:bg-black/80"
              title={musicOn ? "Mute music" : "Play music"}
            >
              {musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={doExport}
            disabled={exporting}
            className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-2 text-[11px] text-zinc-200 backdrop-blur hover:bg-black/80 disabled:opacity-60"
            title="Export to a video file (with music)"
          >
            {exporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {Math.round(progress * 100)}%
              </>
            ) : (
              <>
                {mood !== "none" ? <Music className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />} Export
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
