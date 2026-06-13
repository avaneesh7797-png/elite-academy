import { NextRequest } from "next/server";

// Server-side image proxy + multi-attempt fallback.
//
// Why: the browser calling the free image service directly is the flaky part on
// mobile (slow networks, referrer rules, stalled connections). Fetching it here
// instead runs over the datacenter network, lets us set timeouts and try several
// models in turn, and returns the image bytes from our own origin — so the
// browser just loads a normal same-origin <img> with no cross-origin surprises.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function pollUrl(prompt: string, w: number, h: number, seed: number, model: string): string {
  const params = new URLSearchParams({
    width: String(w),
    height: String(h),
    seed: String(seed),
    model,
    nologo: "true",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

async function tryFetch(url: string, timeoutMs: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      // A plain UA + no Referer avoids browser-referrer rules that can 4xx us.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudioApp/1.0)" },
      cache: "no-store",
    });
    const ct = r.headers.get("content-type") || "";
    if (r.ok && ct.startsWith("image/")) return r;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const prompt = (sp.get("prompt") || "").slice(0, 1200);
  if (!prompt) return new Response("Missing prompt", { status: 400 });

  const w = Math.min(1280, Math.max(64, Number(sp.get("w") || "768") || 768));
  const h = Math.min(1280, Math.max(64, Number(sp.get("h") || "768") || 768));
  const seed = Number(sp.get("seed") || "0") || Math.floor(Math.random() * 1_000_000_000);
  const model = sp.get("model") || "turbo";

  // Attempt order: requested model → small turbo (fast) → flux (best quality).
  const attempts: { url: string; timeout: number }[] = [
    { url: pollUrl(prompt, w, h, seed, model), timeout: 15000 },
    { url: pollUrl(prompt, Math.min(512, w), Math.min(512, h), seed, "turbo"), timeout: 9000 },
  ];
  if (model !== "flux") attempts.push({ url: pollUrl(prompt, Math.min(640, w), Math.min(640, h), seed, "flux"), timeout: 9000 });

  for (const a of attempts) {
    const r = await tryFetch(a.url, a.timeout);
    if (r) {
      const ct = r.headers.get("content-type") || "image/jpeg";
      const buf = await r.arrayBuffer();
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": ct,
          // Cache hard — the (prompt, seed, model) tuple is deterministic.
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  return new Response("Image generation is unavailable right now — please try again.", { status: 502 });
}
