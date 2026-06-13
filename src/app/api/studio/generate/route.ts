import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audioPrompt, dimensionsFor } from "@/lib/studio/types";

// Personal image / video / audio generator backend.
//
//  - Images: free, no API key. Built on Pollinations (https://image.pollinations.ai),
//    which serves a generated image directly from a GET URL. We build the URL and
//    return it; the browser loads it like any other <img src>.
//
//  - Video & audio: text-to-video / text-to-audio via Replicate. Needs a Replicate
//    token, supplied either by the REPLICATE_API_TOKEN env var or by the user pasting
//    it into the app (sent as the `x-studio-key` header). Replicate jobs are async, so
//    POST kicks off a prediction and returns a job id; the client polls
//    GET /api/studio/generate?id=<id> until it succeeds.

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mode: z.enum(["image", "video", "audio"]),
  prompt: z.string().trim().min(1, "Prompt is required").max(1200),
  ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
  model: z.enum(["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"]).optional(),
  seed: z.number().int().positive().optional(),
  audioStyle: z.enum(["music", "ambience", "soundfx", "speech"]).optional(),
  duration: z.number().int().min(1).max(60).optional(),
  // Source image for image-to-video (remote URL or data: URI). Capped so a
  // base64 upload stays under serverless body limits — the client downscales.
  image: z.string().max(8_000_000).optional(),
});

// Replicate official models. Override via env (format "owner/name"). Using the
// official-model predictions endpoint means we don't have to pin a version hash.
const VIDEO_MODEL = process.env.STUDIO_VIDEO_MODEL || "wan-video/wan-2.1-1.3b";
const AUDIO_MODEL = process.env.STUDIO_AUDIO_MODEL || "meta/musicgen";
// Image-to-video model + the name of its image input field (varies per model).
const I2V_MODEL = process.env.STUDIO_I2V_MODEL || "minimax/video-01";
const I2V_IMAGE_KEY = process.env.STUDIO_I2V_IMAGE_KEY || "first_frame_image";

// The token comes from the request header (user pasted it in the app) first,
// then falls back to the server env var.
function tokenFrom(req: NextRequest): string | undefined {
  const header = req.headers.get("x-studio-key")?.trim();
  return header || process.env.REPLICATE_API_TOKEN || undefined;
}

// Point the browser at our own image proxy (/api/studio/image), which fetches
// from the upstream service server-side with timeouts + model fallback. Same
// origin → no cross-origin stalls on mobile.
function buildImageUrl(prompt: string, ratio: string, model: string, seed: number, token?: string): string {
  const { w, h } = dimensionsFor(ratio as never);
  const params = new URLSearchParams({
    prompt,
    w: String(w),
    h: String(h),
    seed: String(seed),
    model,
  });
  if (token) params.set("k", token);
  return `/api/studio/image?${params.toString()}`;
}

function extractMediaUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[output.length - 1] === "string") {
    return output[output.length - 1] as string;
  }
  if (output && typeof output === "object" && "audio" in output) {
    const a = (output as { audio?: unknown }).audio;
    if (typeof a === "string") return a;
  }
  return undefined;
}

function missingTokenResponse(kind: "video" | "audio") {
  return NextResponse.json(
    {
      error: "token_missing",
      message: `${kind === "video" ? "Video" : "Audio"} generation needs a Replicate API token. Paste your token using the “API key” button in the app (or set REPLICATE_API_TOKEN). Image generation works without any key.`,
    },
    { status: 200 },
  );
}

async function startReplicate(
  kind: "video" | "audio",
  model: string,
  input: Record<string, unknown>,
  token: string,
) {
  const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=1",
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message =
      res.status === 401
        ? "Replicate rejected the API token (401). Double-check the key you pasted."
        : `Replicate error (${res.status}). ${detail.slice(0, 300)}`;
    return NextResponse.json({ error: `${kind}_failed`, message }, { status: 200 });
  }

  const job = await res.json();
  return NextResponse.json({
    kind,
    id: job.id,
    status: job.status ?? "starting",
    url: extractMediaUrl(job.output),
  });
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message ?? "Invalid request" : "Invalid request";
    return NextResponse.json({ error: "bad_request", message }, { status: 400 });
  }

  if (parsed.mode === "image") {
    const ratio = parsed.ratio ?? "1:1";
    const seed = parsed.seed ?? Math.floor(Math.random() * 1_000_000_000);
    const pollToken = req.headers.get("x-pollinations-key")?.trim() || undefined;
    const url = buildImageUrl(parsed.prompt, ratio, parsed.model ?? "turbo", seed, pollToken);
    return NextResponse.json({ kind: "image", url, prompt: parsed.prompt, seed });
  }

  const token = tokenFrom(req);

  if (parsed.mode === "video") {
    if (!token) return missingTokenResponse("video");
    // Image-to-video: animate the supplied still according to the prompt.
    if (parsed.image) {
      return startReplicate(
        "video",
        I2V_MODEL,
        { prompt: parsed.prompt, [I2V_IMAGE_KEY]: parsed.image },
        token,
      );
    }
    // Text-to-video: generate a clip from the prompt alone.
    const ratio = parsed.ratio ?? "16:9";
    return startReplicate(
      "video",
      VIDEO_MODEL,
      {
        prompt: parsed.prompt,
        aspect_ratio: ratio === "9:16" ? "9:16" : ratio === "1:1" ? "1:1" : "16:9",
      },
      token,
    );
  }

  // audio
  if (!token) return missingTokenResponse("audio");
  return startReplicate(
    "audio",
    AUDIO_MODEL,
    {
      prompt: audioPrompt(parsed.audioStyle ?? "music", parsed.prompt),
      duration: parsed.duration ?? 8,
    },
    token,
  );
}

// Poll a Replicate job (video or audio) by id.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "bad_request", message: "Missing job id" }, { status: 400 });
  }
  const token = tokenFrom(req);
  if (!token) {
    return NextResponse.json(
      { error: "token_missing", message: "No Replicate API token available." },
      { status: 200 },
    );
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "job_failed", message: `Replicate error (${res.status}).` }, { status: 200 });
  }
  const job = await res.json();
  return NextResponse.json({
    status: job.status,
    url: extractMediaUrl(job.output),
    error: job.error ?? undefined,
  });
}
