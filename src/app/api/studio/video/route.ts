import { NextRequest } from "next/server";

// Free REAL text-to-video via Hugging Face Inference (no Replicate, no cost).
// Tries modern models first (LTX-Video, CogVideoX — 2024/25) and falls back to
// the older lightweight ones. Handles both response shapes: raw video bytes, or
// a JSON body carrying a hosted video URL (redirects to it). Needs a free HF
// token; drawn on HF's free inference credit, so heavy models may be unavailable.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function findVideoUrl(j: unknown): string | undefined {
  if (!j || typeof j !== "object") return undefined;
  const o = j as Record<string, unknown>;
  const v = o.video as Record<string, unknown> | undefined;
  const out = o.output as Record<string, unknown> | undefined;
  const cands = [
    typeof o.url === "string" ? o.url : undefined,
    v && typeof v.url === "string" ? v.url : undefined,
    out && typeof out.url === "string" ? out.url : undefined,
    Array.isArray(o.output) && typeof o.output[0] === "string" ? (o.output[0] as string) : undefined,
  ];
  return cands.find((u) => typeof u === "string" && /^https?:\/\//.test(u));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const prompt = (sp.get("prompt") || "").slice(0, 1000);
  if (!prompt) return new Response("Missing prompt", { status: 400 });

  const token = sp.get("hf") || req.headers.get("x-hf-key") || process.env.HF_TOKEN || undefined;
  if (!token) {
    return new Response(
      "Real AI video needs a free Hugging Face token — add it in the app (API key button).",
      { status: 400 },
    );
  }

  // Best (modern) first → lighter fallbacks. Overridable via STUDIO_HF_VIDEO_MODEL.
  const models = [
    process.env.STUDIO_HF_VIDEO_MODEL,
    "Lightricks/LTX-Video",
    "THUDM/CogVideoX-5b",
    "THUDM/CogVideoX-2b",
    "genmo/mochi-1-preview",
    "cerspense/zeroscope_v2_576w",
    "ali-vilab/text-to-video-ms-1.7b",
  ].filter(Boolean) as string[];

  const bases = [
    "https://router.huggingface.co/hf-inference/models",
    "https://api-inference.huggingface.co/models",
  ];
  const combos: string[] = [];
  for (const m of models) for (const b of bases) combos.push(`${b}/${m}`);

  const deadline = Date.now() + 280_000;
  let ci = 0;
  let warmups = 0;

  while (Date.now() < deadline && ci < combos.length) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 120_000);
    try {
      const r = await fetch(combos[ci], {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "video/mp4",
        },
        body: JSON.stringify({ inputs: prompt }),
        cache: "no-store",
      });
      const ct = r.headers.get("content-type") || "";

      if (r.ok && (ct.startsWith("video/") || ct.startsWith("image/") || ct.includes("octet-stream"))) {
        const buf = await r.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": ct.startsWith("video/") || ct.startsWith("image/") ? ct : "video/mp4",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }

      // Some providers reply with JSON carrying a hosted video URL → go to it.
      if (r.ok && ct.includes("application/json")) {
        const j = await r.json().catch(() => null);
        const url = findVideoUrl(j);
        if (url) return Response.redirect(url, 302);
      }

      // Model warming up — wait a couple times on this combo, then move on.
      if (r.status === 503 && warmups < 2 && Date.now() + 12000 < deadline) {
        warmups += 1;
        await sleep(10000);
        continue;
      }
      ci += 1;
      warmups = 0;
    } catch {
      ci += 1;
      warmups = 0;
    } finally {
      clearTimeout(to);
    }
  }

  return new Response(
    "Couldn't generate a free AI video right now — the modern HF video models may not be available on the free tier. Try again, use the free Motion engine, or add HF PRO / a Replicate key for guaranteed high-quality video.",
    { status: 502 },
  );
}
