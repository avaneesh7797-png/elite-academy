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

// --- Provider 1: Hugging Face Inference API (FLUX) ---
async function tryHuggingFace(
  prompt: string,
  w: number,
  h: number,
  seed: number,
  token: string,
  budgetMs: number,
): Promise<Response | null> {
  const model = process.env.STUDIO_HF_MODEL || "black-forest-labs/FLUX.1-schnell";
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const deadline = Date.now() + budgetMs;
  let wait = 4000;

  while (Date.now() < deadline) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 25000);
    try {
      const r = await fetch(url, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width: w, height: h, seed },
        }),
        cache: "no-store",
      });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.startsWith("image/")) {
        return imageResponse(await r.arrayBuffer(), ct);
      }
      // 503 => model is warming up; wait and retry within budget.
      if (r.status === 503) {
        if (Date.now() + wait > deadline) return null;
        await sleep(wait);
        wait = Math.min(wait + 3000, 12000);
        continue;
      }
      // 401/400/etc — token or request problem; don't burn the budget.
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(to);
    }
  }
  return null;
}

// --- Provider 2: Pollinations (keyless, rate-limited; token optional) ---
function pollUrl(prompt: string, w: number, h: number, seed: number, model: string, token?: string): string {
  const params = new URLSearchParams({
    width: String(w),
    height: String(h),
    seed: String(seed),
    model,
    nologo: "true",
  });
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
): Promise<Response | null> {
  const urls = [
    pollUrl(prompt, w, h, seed, model, token),
    pollUrl(prompt, Math.min(512, w), Math.min(512, h), seed, "turbo", token),
  ];
  if (model !== "flux") urls.push(pollUrl(prompt, Math.min(640, w), Math.min(640, h), seed, "flux", token));

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
