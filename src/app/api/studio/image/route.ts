import { NextRequest } from "next/server";

// Server-side image proxy with multiple providers + fallback.
//
// Pollinations (the free, keyless service) now rate-limits anonymous use hard
// (HTTP 402 "queue full"), so this route prefers Hugging Face's Inference API
// when a (free) HF token is supplied, and falls back to Pollinations otherwise.
// Either way it fetches server-side, retries sensibly, and streams the image
// bytes back from our own origin.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function imageResponse(buf: ArrayBuffer, contentType: string): Response {
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// --- Provider 1: Hugging Face Inference (FLUX / SDXL) ---
// HF migrated serverless inference to router.huggingface.co; the legacy
// api-inference host still answers for some models. Try the router first, then
// legacy, across a couple of widely-available models, so a valid token works
// regardless of which path/model HF is currently serving.
async function hfPost(url: string, token: string, body: unknown, timeoutMs: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/png" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

async function tryHuggingFace(
  prompt: string,
  w: number,
  h: number,
  seed: number,
  token: string,
  budgetMs: number,
): Promise<Response | null> {
  // FLUX.1-dev first — much better prompt adherence + detail than schnell —
  // then reliable/faster fallbacks. Overridable via STUDIO_HF_MODEL.
  const models = [
    process.env.STUDIO_HF_MODEL || "black-forest-labs/FLUX.1-dev",
    "stabilityai/stable-diffusion-3.5-large",
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
  ];
  const bases = [
    "https://router.huggingface.co/hf-inference/models",
    "https://api-inference.huggingface.co/models",
  ];
  const combos: string[] = [];
  for (const m of models) for (const b of bases) combos.push(`${b}/${m}`);

  const W = Math.min(1024, Math.max(512, Math.round(w / 16) * 16));
  const H = Math.min(1024, Math.max(512, Math.round(h / 16) * 16));
  const deadline = Date.now() + budgetMs;

  for (const url of combos) {
    if (Date.now() > deadline) break;
    // Try with size params (bigger / correct aspect), then a minimal payload
    // fallback (some models 400 on params — the proven path stays working).
    const bodies = [{ inputs: prompt, parameters: { width: W, height: H } }, { inputs: prompt }];
    for (const body of bodies) {
      let r = await hfPost(url, token, body, 30000);
      if (r && r.status === 503 && Date.now() + 8000 < deadline) {
        await sleep(6000);
        r = await hfPost(url, token, body, 30000);
      }
      if (!r) continue;
      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.startsWith("image/")) return imageResponse(await r.arrayBuffer(), ct);
      // Non-image response → try the next body / combo.
    }
  }
  return null;
}

// --- Provider 2: Pollinations (keyless, rate-limited; token optional) ---
// `init` enables image-to-image: Pollinations' editing models (kontext) take a
// source image and modify it per the prompt. Chaining frame N -> N+1 this way
// is what gives free "animation" real continuity, since each frame is an edit
// of the previous one rather than a fresh draw.
function pollUrl(
  prompt: string,
  w: number,
  h: number,
  seed: number,
  model: string,
  token?: string,
  init?: string,
): string {
  const params = new URLSearchParams({
    width: String(w),
    height: String(h),
    seed: String(seed),
    model: init ? "kontext" : model,
    nologo: "true",
  });
  if (init) params.set("image", init);
  if (token) params.set("token", token);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

type Attempt = "ok" | "ratelimited" | "fail";

async function pollFetch(url: string, timeoutMs: number, token?: string): Promise<{ kind: Attempt; res?: Response }> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (compatible; StudioApp/1.0)" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(url, { signal: ctrl.signal, headers, cache: "no-store" });
    const ct = r.headers.get("content-type") || "";
    if (r.ok && ct.startsWith("image/")) return { kind: "ok", res: r };
    if (r.status === 402 || r.status === 429 || r.status === 503) return { kind: "ratelimited" };
    return { kind: "fail" };
  } catch {
    return { kind: "fail" };
  } finally {
    clearTimeout(to);
  }
}

async function tryPollinations(
  prompt: string,
  w: number,
  h: number,
  seed: number,
  model: string,
  token: string | undefined,
  budgetMs: number,
  init?: string,
): Promise<Response | null> {
  // With an init image, image-to-image is the whole point — don't silently fall
  // back to a fresh text-only draw, that's what breaks animation continuity.
  const urls = init
    ? [pollUrl(prompt, w, h, seed, model, token, init)]
    : [
        pollUrl(prompt, w, h, seed, model, token),
        pollUrl(prompt, Math.min(512, w), Math.min(512, h), seed, "turbo", token),
      ];
  if (!init && model !== "flux") {
    urls.push(pollUrl(prompt, Math.min(640, w), Math.min(640, h), seed, "flux", token));
  }

  const deadline = Date.now() + budgetMs;
  let i = 0;
  let backoff = 3500;
  while (Date.now() < deadline) {
    const { kind, res } = await pollFetch(urls[Math.min(i, urls.length - 1)], 15000, token);
    if (kind === "ok" && res) {
      const ct = res.headers.get("content-type") || "image/jpeg";
      return imageResponse(await res.arrayBuffer(), ct);
    }
    if (kind === "ratelimited") {
      if (Date.now() + backoff > deadline) break;
      await sleep(backoff);
      backoff = Math.min(backoff + 2500, 9000);
      i = 0;
      continue;
    }
    i += 1;
    if (i >= urls.length) {
      if (Date.now() + 1500 > deadline) break;
      await sleep(1500);
      i = 0;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const prompt = (sp.get("prompt") || "").slice(0, 1200);
  if (!prompt) return new Response("Missing prompt", { status: 400 });

  const w = Math.min(1280, Math.max(64, Number(sp.get("w") || "768") || 768));
  const h = Math.min(1280, Math.max(64, Number(sp.get("h") || "768") || 768));
  const seed = Number(sp.get("seed") || "0") || Math.floor(Math.random() * 1_000_000_000);
  const model = sp.get("model") || "turbo";

  const hfToken = sp.get("hf") || req.headers.get("x-hf-key") || process.env.HF_TOKEN || undefined;
  const pollToken =
    sp.get("k") || req.headers.get("x-pollinations-key") || process.env.POLLINATIONS_TOKEN || undefined;

  // Diagnostic mode: append &debug=1 to see exactly what each provider returns.
  if (sp.get("debug") === "1") {
    const report: Record<string, unknown> = { hasHfToken: !!hfToken, hasPollToken: !!pollToken };
    if (hfToken) {
      const url = `https://router.huggingface.co/hf-inference/models/${process.env.STUDIO_HF_MODEL || "black-forest-labs/FLUX.1-schnell"}`;
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 20000);
        const r = await fetch(url, {
          method: "POST",
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json", Accept: "image/png" },
          body: JSON.stringify({ inputs: prompt }),
          cache: "no-store",
        });
        clearTimeout(to);
        const ct = r.headers.get("content-type") || "";
        report.hf = { status: r.status, contentType: ct, body: ct.startsWith("image/") ? "(image ok)" : (await r.text()).slice(0, 400) };
      } catch (e) {
        report.hf = { error: String(e) };
      }
    }
    return Response.json(report);
  }

  // Image-to-image: `init` is the previous animation frame. Only Pollinations'
  // editing model supports it, so skip the HF text-only path entirely — an
  // init-less fallback would break the frame-to-frame continuity we need.
  const init = sp.get("init") || undefined;
  if (init) {
    const edited = await tryPollinations(prompt, w, h, seed, model, pollToken, 60000, init);
    if (edited) return edited;
    return new Response("Couldn't edit the previous frame (image-to-image unavailable).", { status: 503 });
  }

  // Prefer Hugging Face when a token is present (far more reliable than the
  // throttled free Pollinations tier), then fall back to Pollinations.
  if (hfToken) {
    const hf = await tryHuggingFace(prompt, w, h, seed, hfToken, 40000);
    if (hf) return hf;
  }
  const poll = await tryPollinations(prompt, w, h, seed, model, pollToken, hfToken ? 15000 : 45000);
  if (poll) return poll;

  const msg = hfToken
    ? "Couldn't generate the image right now — the model may be warming up. Try again in a moment."
    : pollToken
      ? "The image service is busy right now — please try again in a moment."
      : "Image generation is rate-limited. Add a free Hugging Face token in the app (API key button) for reliable images.";
  return new Response(msg, { status: 503 });
}
