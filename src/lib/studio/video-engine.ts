"use client";

// Free, fully client-side "video generation": animate one or more still images
// on a canvas (Ken Burns / zoom / pan / morph) and optionally record the canvas
// to a real downloadable video file via MediaRecorder. No server, no API key.
//
// Live playback works in every browser that supports <canvas>. File export needs
// MediaRecorder + canvas.captureStream (Chrome/Android/desktop Safari 15+); when
// that's unavailable we just keep the live preview and tell the user.

import type { Motion } from "./types";

export function loadImage(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

// 0 -> 1 -> 0, so single-image motions start and end identically (seamless loop).
function pingpong(t: number): number {
  return 1 - Math.abs(1 - 2 * t);
}
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

type Transform = { scale: number; panX: number; panY: number };

// panX / panY are in [-1, 1] across the overscan margin created by `scale`.
function transformFor(motion: Motion, t: number): Transform {
  const p = easeInOut(pingpong(t));
  switch (motion) {
    case "zoom-in":
      return { scale: 1.04 + 0.24 * p, panX: 0, panY: 0 };
    case "zoom-out":
      return { scale: 1.28 - 0.24 * p, panX: 0, panY: 0 };
    case "pan-left":
      return { scale: 1.16, panX: 0.7 - 1.4 * p, panY: 0 };
    case "pan-right":
      return { scale: 1.16, panX: -0.7 + 1.4 * p, panY: 0 };
    case "pan-up":
      return { scale: 1.16, panX: 0, panY: 0.7 - 1.4 * p };
    case "pan-down":
      return { scale: 1.16, panX: 0, panY: -0.7 + 1.4 * p };
    case "float": {
      const a = 2 * Math.PI * t; // periodic -> seamless
      return { scale: 1.08 + 0.03 * Math.sin(a), panX: 0.08 * Math.sin(a), panY: 0.06 * Math.cos(a) };
    }
    case "kenburns":
    default:
      return { scale: 1.06 + 0.18 * p, panX: -0.45 + 0.9 * p, panY: -0.25 + 0.5 * p };
  }
}

// Draw an image to fully cover WxH with an extra `scale` and normalized pan.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  scale: number,
  panX: number,
  panY: number,
  alpha = 1,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(W / iw, H / ih);
  const s = base * scale;
  const dw = iw * s;
  const dh = ih * s;
  const dx = (W - dw) / 2 + (panX * (dw - W)) / 2;
  const dy = (H - dh) / 2 + (panY * (dh - H)) / 2;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.globalAlpha = 1;
}

// Film-look post-processing: teal-orange grade, vignette, grain, letterbox.
function applyCinematic(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  // Warm highlights / cool shadows via soft overlays.
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = "rgba(255,150,70,0.05)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(30,120,200,0.05)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // Vignette.
  const r = Math.max(W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, r * 0.32, W / 2, H / 2, r * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Sparse film grain.
  const grains = Math.floor((W * H) / 1400);
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < grains; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "#000" : "#fff";
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Cinematic 2.39:1 letterbox bars (only if they fit).
  const barH = (H - W / 2.39) / 2;
  if (barH > 2) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);
  }
  ctx.restore();
}

// Render a single frame at normalized time t in [0, 1).
export function drawMotionFrame(
  ctx: CanvasRenderingContext2D,
  imgs: HTMLImageElement[],
  motion: Motion,
  t: number,
  W: number,
  H: number,
  cinematic = false,
) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (!imgs.length) return;

  // TRUE frame-by-frame animation with CONTINUOUS interpolation.
  //
  // Each AI frame is drawn independently, so playing them straight looks like
  // "photos sped up" — every frame pops. Instead we blend across the WHOLE gap
  // between consecutive frames (optical-dissolve style) and add a tiny
  // sub-frame camera drift, so the eye reads continuous motion like real video
  // rather than a slideshow. Three overlapping layers smooth it further.
  if (motion === "frames" && imgs.length > 1) {
    const n = imgs.length;
    const f = t * n;
    const i = Math.floor(f) % n;
    const frac = f - Math.floor(f);
    const s = easeInOut(frac); // eased blend = no hard cut at frame borders

    const prev = imgs[(i - 1 + n) % n];
    const cur = imgs[i];
    const next = imgs[(i + 1) % n];

    // Sub-frame drift: a continuous micro push-in across each frame keeps the
    // image physically moving even while the AI content is static.
    const zA = 1.03 + 0.02 * frac;
    const zB = 1.03 + 0.02 * (frac - 1);
    const dx = 0.02 * (frac - 0.5);

    // Tail of the previous frame keeps motion alive through the hand-off.
    if (frac < 0.25) {
      drawCover(ctx, prev, W, H, zA + 0.02, dx, 0, 1 - frac / 0.25);
    }
    // Current frame fades out as the next fades in — always cross-dissolving.
    drawCover(ctx, cur, W, H, zA, dx, 0, 1 - s * 0.85);
    drawCover(ctx, next, W, H, zB + 0.02, dx, 0, s * 0.85);

    if (cinematic) applyCinematic(ctx, W, H);
    return;
  }

  if (motion === "morph" && imgs.length > 1) {
    // Cinematic multi-frame ("story") render: each keyframe gets its own Ken
    // Burns pan/zoom, and consecutive frames crossfade — so it feels like a
    // moving video, not a slideshow. Wraps last→first for a seamless loop.
    const n = imgs.length;
    const f = t * n;
    const i = Math.floor(f) % n;
    const frac = f - Math.floor(f);

    // Per-keyframe Ken Burns trajectory, chosen deterministically by index.
    const kb = (idx: number, p: number) => {
      const dir = idx % 4;
      const zoom = 1.05 + 0.14 * p; // slow push-in across the shot
      const amt = 0.28 * p;
      const panX = dir === 0 ? -amt : dir === 1 ? amt : 0;
      const panY = dir === 2 ? -amt : dir === 3 ? amt : 0;
      return { zoom, panX, panY };
    };

    const cur = kb(i, frac);
    drawCover(ctx, imgs[i], W, H, cur.zoom, cur.panX, cur.panY, 1);

    // Long, smooth cross-dissolve into the next keyframe (last 42% of the shot)
    // so motion reads as continuous film, not a slideshow cut.
    const XF = 0.58;
    if (frac > XF) {
      const a = easeInOut((frac - XF) / (1 - XF));
      const nxt = kb((i + 1) % n, easeInOut((frac - XF) / (1 - XF)) * 0.5);
      drawCover(ctx, imgs[(i + 1) % n], W, H, nxt.zoom, nxt.panX, nxt.panY, a);
    }
    if (cinematic) applyCinematic(ctx, W, H);
    return;
  }

  const { scale, panX, panY } = transformFor(motion, t);
  drawCover(ctx, imgs[0], W, H, scale, panX, panY, 1);
  if (cinematic) applyCinematic(ctx, W, H);
}

export function exportSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder === "undefined") return false;
  const c = document.createElement("canvas");
  return typeof (c as unknown as { captureStream?: unknown }).captureStream === "function";
}

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return candidates.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m);
    } catch {
      return false;
    }
  });
}

export type RecordOptions = {
  imgs: HTMLImageElement[];
  motion: Motion;
  W: number;
  H: number;
  durationMs: number;
  fps?: number;
  cinematic?: boolean;
  audioStream?: MediaStream | null; // optional soundtrack to mux into the file
  onProgress?: (p: number) => void;
};

// Record one loop of the animation to a video Blob. Returns null if the browser
// can't record (e.g. iOS without MediaRecorder) or the canvas is tainted.
export async function recordMotionVideo(opts: RecordOptions): Promise<Blob | null> {
  const { imgs, motion, W, H, durationMs, fps = 30, cinematic = false, audioStream, onProgress } = opts;
  if (!exportSupported()) return null;
  const mime = pickMime();
  if (!mime) return null;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let stream: MediaStream;
  try {
    stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(fps);
    // Mux in the soundtrack, if the browser allows combining tracks.
    if (audioStream) {
      try {
        for (const track of audioStream.getAudioTracks()) stream.addTrack(track);
      } catch {
        /* audio muxing unsupported — export video only */
      }
    }
  } catch {
    return null;
  }

  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  } catch {
    try {
      rec = new MediaRecorder(stream);
    } catch {
      return null;
    }
  }

  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
  });

  try {
    rec.start();
  } catch {
    return null;
  }

  const start = performance.now();
  let tainted = false;
  await new Promise<void>((resolve) => {
    const frame = (now: number) => {
      const el = now - start;
      const t = (el % durationMs) / durationMs;
      try {
        drawMotionFrame(ctx, imgs, motion, t, W, H, cinematic);
      } catch {
        tainted = true;
        resolve();
        return;
      }
      onProgress?.(Math.min(1, el / durationMs));
      if (el >= durationMs) {
        resolve();
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  try {
    rec.stop();
  } catch {
    /* ignore */
  }
  await stopped;

  if (tainted || !chunks.length) return null;
  return new Blob(chunks, { type: mime });
}

export function dimsForRatio(ratio?: string): { W: number; H: number } {
  switch (ratio) {
    case "16:9":
      return { W: 1280, H: 720 };
    case "9:16":
      return { W: 720, H: 1280 };
    case "4:3":
      return { W: 1024, H: 768 };
    case "3:4":
      return { W: 768, H: 1024 };
    default:
      return { W: 768, H: 768 };
  }
}
