import { NextRequest } from "next/server";

// Server-side image proxy + multi-attempt fallback.
//
// The free upstream service (Pollinations) now rate-limits anonymous use hard
// (HTTP 402, "queue full", max 1 in-flight per IP) and offers a free token for
// higher limits. So this route:
//   - forwards a token if the user supplied one (query `k`, header, or env),
//   - fetches server-side with timeouts and model fallback,
//   - retries patiently with backoff when it sees the rate-limit response,
//   - streams the image bytes back from our own origin.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Attempt = "ok" | "ratelimited" | "fail";

async function tryFetch(
  url: string,
  timeoutMs: number,
  token?: string,
): Promise<{ kind: Attempt; res?: Response }> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (compatible; StudioApp/1.0)" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(url, { signal: ctrl.signal, headers, cache: "no-store" });
    const ct = r.headers.get("content-type") || "";
    if (r.ok && ct.startsWith("image/")) return { kind: "ok", res: r };
    // 402 / 429 or a JSON "queue full" body => rate limited, worth a backoff retry.
    if (r.status === 402 || r.status === 429 || r.status === 503) return { kind: "ratelimited" };
    return { kind: "fail" };
  } catch {
    return { kind: "fail" };
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
  const token =
    sp.get("k") || req.headers.get("x-pollinations-key") || process.env.POLLINATIONS_TOKEN || undefined;

  // Each entry is one upstream URL we'll try, in order.
  const urls = [
    pollUrl(prompt, w, h, seed, model, token),
    pollUrl(prompt, Math.min(512, w), Math.min(512, h), seed, "turbo", token),
  ];
  if (model !== "flux") urls.push(pollUrl(prompt, Math.min(640, w), Math.min(640, h), seed, "flux", token));

  // Patient loop: cycle through the candidate URLs; on a rate-limit response,
  // back off and try again, staying within the function budget.
  const deadline = Date.now() + 45000;
  let i = 0;
  let backoff = 3500;
  while (Date.now() < deadline) {
    const url = urls[Math.min(i, urls.length - 1)];
    const { kind, res } = await tryFetch(url, 15000, token);
    if (kind === "ok" && res) {
      const ct = res.headers.get("content-type") || "image/jpeg";
      const buf = await res.arrayBuffer();
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": ct,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (kind === "ratelimited") {
      // Don't hammer — wait for the per-IP queue to drain, then retry.
      if (Date.now() + backoff > deadline) break;
      await sleep(backoff);
      backoff = Math.min(backoff + 2500, 9000);
      i = 0; // retry the preferred model after waiting
      continue;
    }
    // Hard failure on this candidate — move to the next one.
    i += 1;
    if (i >= urls.length) {
      if (Date.now() + 2000 > deadline) break;
      await sleep(1500);
      i = 0;
    }
  }

  return new Response(
    token
      ? "The image service is busy right now — please try again in a moment."
      : "The free image service is rate-limited. Add a free Pollinations token in the app (API key button) for reliable, unlimited images.",
    { status: 503 },
  );
}
