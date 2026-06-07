"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Pause, Play } from "lucide-react";
import {
  dimsForRatio,
  drawMotionFrame,
  exportSupported,
  loadImage,
  recordMotionVideo,
} from "@/lib/studio/video-engine";
import type { Motion } from "@/lib/studio/types";

type Props = {
  images: string[];
  motion: Motion;
  durationMs?: number;
  ratio?: string;
  fps?: number;
  onToast?: (msg: string) => void;
};

// A free, in-browser "video": animates the source image(s) live on a looping
// canvas, with an export-to-file button when the browser supports recording.
export default function CanvasVideo({ images, motion, durationMs = 4000, ratio, fps = 30, onToast }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgsRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const playingRef = useRef<boolean>(true);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const { W, H } = dimsForRatio(ratio);
  const key = images.join("|");

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Load the frame images for display (no crossOrigin → max compatibility).
  useEffect(() => {
    let alive = true;
    setReady(false);
    setFailed(false);
    Promise.all(images.map((src) => loadImage(src, false)))
      .then((imgs) => {
        if (!alive) return;
        imgsRef.current = imgs;
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
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
        drawMotionFrame(ctx, imgsRef.current, motion, lastTRef.current, W, H);
      } catch {
        /* ignore transient draw errors */
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, motion, durationMs, W, H]);

  async function doExport() {
    if (exporting) return;
    if (!exportSupported()) {
      onToast?.("This browser can't export video files — but it plays here. Try Chrome or Android.");
      return;
    }
    setExporting(true);
    setProgress(0);
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
      onToast?.("Video file exported ✓");
    } catch {
      onToast?.("Couldn't export this video.");
    } finally {
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
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-black">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          <span className="text-[11px] text-zinc-600">Preparing motion…</span>
        </div>
      ) : (
        <canvas ref={canvasRef} className="block w-full" />
      )}

      {/* Live badge */}
      {ready && !failed && (
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300 backdrop-blur">
          ● Live preview
        </span>
      )}

      {/* Controls */}
      {ready && !failed && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="rounded-full bg-black/60 p-2 text-zinc-200 backdrop-blur hover:bg-black/80"
            title={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={doExport}
            disabled={exporting}
            className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-2 text-[11px] text-zinc-200 backdrop-blur hover:bg-black/80 disabled:opacity-60"
            title="Export to a video file"
          >
            {exporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {Math.round(progress * 100)}%
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" /> Export
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
