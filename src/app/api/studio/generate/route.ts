import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dimensionsFor } from "@/lib/studio/types";

// Personal image / video generator backend.
//
//  - Images: free, no API key. Built on Pollinations (https://image.pollinations.ai),
//    which serves a generated image directly from a GET URL. We build the URL and
//    return it; the browser loads it like any other <img src>.
//
//  - Video: text-to-video via Replicate. Requires REPLICATE_API_TOKEN. Replicate jobs
//    are async, so POST kicks off a prediction and returns a job id, then the client
//    polls GET /api/studio/generate?id=<id> until it succeeds.

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mode: z.enum(["image", "video"]),
  prompt: z.string().trim().min(1, "Prompt is required").max(1200),
  ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
  model: z.enum(["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"]).optional(),
  seed: z.number().int().positive().optional(),
});

// Replicate official model used for text-to-video. Override with STUDIO_VIDEO_MODEL
// (format "owner/name"). Uses the official-model predictions endpoint so we don't
// have to pin a version hash.
const VIDEO_MODEL = process.env.STUDIO_VIDEO_MODEL || "wan-video/wan-2.1-1.3b";

function buildImageUrl(prompt: string, ratio: string, model: string, seed: number): string {
  const { w, h } = dimensionsFor(ratio as never);
  const params = new URLSearchParams({
    width: String(w),
    height: String(h),
    seed: String(seed),
    model,
    nologo: "true",
    referrer: "elite-studio",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

async function startVideo(prompt: string, ratio: string) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: "video_unconfigured",
        message:
          "Video generation needs a Replicate API token. Add REPLICATE_API_TOKEN to the environment to enable it. Image generation works without any key.",
      },
      { status: 200 },
    );
  }

  const res = await fetch(`https://api.replicate.com/v1/models/${VIDEO_MODEL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=1",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: ratio === "9:16" ? "9:16" : ratio === "1:1" ? "1:1" : "16:9",
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "video_failed", message: `Replicate error (${res.status}). ${detail.slice(0, 300)}` },
      { status: 200 },
    );
  }

  const job = await res.json();
  return NextResponse.json({
    kind: "video",
    id: job.id,
    status: job.status ?? "starting",
    url: extractVideoUrl(job.output),
  });
}

function extractVideoUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[output.length - 1] === "string") {
    return output[output.length - 1] as string;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message ?? "Invalid request" : "Invalid request";
    return NextResponse.json({ error: "bad_request", message }, { status: 400 });
  }

  const ratio = parsed.ratio ?? (parsed.mode === "video" ? "16:9" : "1:1");

  if (parsed.mode === "image") {
    const seed = parsed.seed ?? Math.floor(Math.random() * 1_000_000_000);
    const url = buildImageUrl(parsed.prompt, ratio, parsed.model ?? "flux", seed);
    return NextResponse.json({ kind: "image", url, prompt: parsed.prompt, seed });
  }

  return startVideo(parsed.prompt, ratio);
}

// Poll a Replicate video job.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "bad_request", message: "Missing job id" }, { status: 400 });
  }
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "video_unconfigured", message: "REPLICATE_API_TOKEN is not set." },
      { status: 200 },
    );
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "video_failed", message: `Replicate error (${res.status}).` }, { status: 200 });
  }
  const job = await res.json();
  return NextResponse.json({
    kind: "video",
    id: job.id,
    status: job.status,
    url: extractVideoUrl(job.output),
    error: job.error ?? undefined,
  });
}
