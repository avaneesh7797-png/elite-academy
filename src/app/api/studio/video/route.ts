import { NextRequest } from "next/server";

// Free REAL text-to-video via Hugging Face Inference (no Replicate, no cost).
// These free models are short + low-res (2023-era diffusers T2V), but the output
// is genuinely generated video, not a slideshow. Needs a free HF token.
//
// Called directly as an <video src>. We fetch server-side (datacenter network),
// retry through model warm-up, and stream the mp4/gif bytes back from our origin.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const models = [
    process.env.STUDIO_HF_VIDEO_MODEL || "ali-vilab/text-to-video-ms-1.7b",
    "cerspense/zeroscope_v2_576w",
    "damo-vilab/text-to-video-ms-1.7b",
  ];
  const bases = [
    "https://router.huggingface.co/hf-inference/models",
    "https://api-inference.huggingface.co/models",
  ];
  const combos: string[] = [];
  for (const m of models) for (const b of bases) combos.push(`${b}/${m}`);

  const deadline = Date.now() + 50_000;
  let ci = 0;
  let warmups = 0;

  while (Date.now() < deadline && ci < combos.length) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45_000);
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
      // Model warming up — wait a couple times on this combo, then move on.
      if (r.status === 503 && warmups < 2 && Date.now() + 8000 < deadline) {
        warmups += 1;
        await sleep(7000);
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
    "Couldn't generate a free AI video right now (the free HF video models may be busy or unavailable). Try again, or use the free Motion engine.",
    { status: 502 },
  );
}
