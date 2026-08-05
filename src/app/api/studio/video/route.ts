import { NextRequest } from "next/server";

// Free REAL text-to-video — two "no-cost" paths, tried in order:
//
//  1) KEYLESS: public Hugging Face Spaces that host video models on community
//     GPUs and expose a Gradio API. No token needed at all. We auto-discover the
//     Space's endpoint from /gradio_api/info, call it, and redirect to the
//     generated video. Spaces sleep / queue, so this is best-effort.
//  2) With a free HF token: the hf-inference serverless models (older, lighter).
//
// If both miss, we return a clear 502 and the UI offers the always-free Motion
// engine. Configure Spaces with STUDIO_VIDEO_SPACES (comma-separated hosts).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Public text-to-video Spaces to try (host only). Override via env.
const DEFAULT_SPACES = [
  "ali-vilab-modelscope-text-to-video-synthesis.hf.space",
  "kadirnar-open-sora.hf.space",
  "bytedance-animatediff-lightning.hf.space",
  "kingnish-instant-video.hf.space",
];

function abs(u: string, host: string): string {
  if (/^https?:\/\//.test(u)) return u;
  if (u.startsWith("/")) return `${host}${u}`;
  return `${host}/${u}`;
}

// Recursively hunt a video URL out of any Gradio output shape.
function deepFindVideo(node: unknown, host: string): string | null {
  if (typeof node === "string") {
    if (/\.(mp4|webm|mov|gif)(\?|$)/i.test(node)) return abs(node, host);
    if (node.includes("/file=")) return abs(node, host);
    return null;
  }
  if (Array.isArray(node)) {
    for (const x of node) {
      const u = deepFindVideo(x, host);
      if (u) return u;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.url === "string") {
      const u = deepFindVideo(o.url, host);
      if (u) return u;
    }
    if (typeof o.path === "string") {
      if (/\.(mp4|webm|mov|gif)$/i.test(o.path)) return `${host}/gradio_api/file=${o.path}`;
    }
    if (o.video) {
      const u = deepFindVideo(o.video, host);
      if (u) return u;
    }
    for (const k of Object.keys(o)) {
      const u = deepFindVideo(o[k], host);
      if (u) return u;
    }
  }
  return null;
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

function defaultParam(p: Record<string, unknown>): unknown {
  if (p.parameter_has_default) return p.parameter_default;
  const t = ((p.type as Record<string, unknown> | undefined)?.type as string) || "";
  if (t === "number" || t === "integer") return 0;
  if (t === "boolean") return false;
  return "";
}

// Call one Gradio endpoint: submit, then read the event stream to completion.
async function callGradio(host: string, fn: string, data: unknown[], budgetMs: number): Promise<string | null> {
  const sub = await fetchWithTimeout(`${host}/gradio_api/call/${fn}`, 20000, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!sub || !sub.ok) return null;
  const sj = (await sub.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = (sj?.event_id as string) || (sj ? (Object.values(sj)[0] as string) : "");
  if (!eventId || typeof eventId !== "string") return null;

  const res = await fetchWithTimeout(`${host}/gradio_api/call/${fn}/${eventId}`, budgetMs);
  if (!res || !res.ok) return null;
  const text = await res.text().catch(() => "");
  if (!text) return null;

  // Prefer the payload after "event: complete"; else scan all data lines.
  for (const block of text.split(/\n\n/)) {
    if (block.includes("event: complete")) {
      const m = block.match(/data:\s*([\s\S]+)/);
      if (m) {
        try {
          const u = deepFindVideo(JSON.parse(m[1].trim()), host);
          if (u) return u;
        } catch {
          /* ignore */
        }
      }
    }
  }
  const lines = [...text.matchAll(/data:\s*(.+)/g)].map((x) => x[1]);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const u = deepFindVideo(JSON.parse(lines[i]), host);
      if (u) return u;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// Auto-discover a Space's text-to-video endpoint and run it. `wakeAttempts`
// retries the info fetch so a cold-starting Space gets picked up once it's up.
async function tryGradioSpace(
  host: string,
  prompt: string,
  budgetMs: number,
  wakeAttempts = 1,
): Promise<string | null> {
  let info: Response | null = null;
  for (let i = 0; i < wakeAttempts; i++) {
    info = await fetchWithTimeout(`${host}/gradio_api/info`, 20000);
    if (info && info.ok) break;
    if (i < wakeAttempts - 1) await sleep(8000); // give the Space time to wake
  }
  if (!info || !info.ok) return null;
  const parsed = (await info.json().catch(() => null)) as Record<string, unknown> | null;
  const named = (parsed?.named_endpoints as Record<string, Record<string, unknown>>) || {};
  for (const [name, ep] of Object.entries(named)) {
    const params = (ep.parameters as Record<string, unknown>[]) || [];
    if (!params.length) continue;
    const returns = ep.returns || [];
    if (!JSON.stringify(returns).toLowerCase().includes("video")) continue;
    const data = params.map((p, i) => (i === 0 ? prompt : defaultParam(p)));
    const url = await callGradio(host, name.replace(/^\//, ""), data, budgetMs);
    if (url) return url;
  }
  return null;
}

// --- Fallback: hf-inference serverless (needs a token) ---
async function tryHfInference(prompt: string, token: string, budgetMs: number): Promise<Response | null> {
  const models = ["Lightricks/LTX-Video", "THUDM/CogVideoX-2b", "ali-vilab/text-to-video-ms-1.7b"];
  const deadline = Date.now() + budgetMs;
  for (const m of models) {
    if (Date.now() > deadline) break;
    const r = await fetchWithTimeout(`https://router.huggingface.co/hf-inference/models/${m}`, 60000, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "video/mp4" },
      body: JSON.stringify({ inputs: prompt }),
    });
    if (!r) continue;
    const ct = r.headers.get("content-type") || "";
    if (r.ok && (ct.startsWith("video/") || ct.startsWith("image/"))) {
      const buf = await r.arrayBuffer();
      return new Response(buf, {
        status: 200,
        headers: { "Content-Type": ct, "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }
    if (r.status === 503) await sleep(4000);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const prompt = (sp.get("prompt") || "").slice(0, 1000);
  if (!prompt) return new Response("Missing prompt", { status: 400 });

  const deadline = Date.now() + 270_000;

  // 1) Keyless Spaces — no token. YOUR configured Space(s) go first and get
  // more patience (wake retries + bigger budget); public ones are quick tries.
  const norm = (h: string) => (h.startsWith("http") ? h : `https://${h}`);
  const configured = (process.env.STUDIO_VIDEO_SPACES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => ({ host: norm(h), wake: 4, budget: 130_000 }));
  const defaults = DEFAULT_SPACES.map((h) => ({ host: norm(h), wake: 1, budget: 60_000 }));

  for (const s of [...configured, ...defaults]) {
    if (Date.now() > deadline - 20_000) break;
    try {
      const url = await tryGradioSpace(s.host, prompt, s.budget, s.wake);
      if (url) return Response.redirect(url, 302);
    } catch {
      /* try next space */
    }
  }

  // 2) hf-inference fallback (only if a token is available).
  const token = sp.get("hf") || req.headers.get("x-hf-key") || process.env.HF_TOKEN || undefined;
  if (token && Date.now() < deadline) {
    const res = await tryHfInference(prompt, token, Math.max(20_000, deadline - Date.now()));
    if (res) return res;
  }

  return new Response(
    "The free video models are busy or asleep right now (community GPUs queue up). Tap “Make it free with Motion” for a cinematic clip instantly, or try again in a bit.",
    { status: 502 },
  );
}
