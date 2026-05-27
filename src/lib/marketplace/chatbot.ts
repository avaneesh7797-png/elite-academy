import { parseJsonArray } from "./types";

type BusinessForChat = {
  name: string;
  category: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  amenities: string;
  chatGreeting: string;
  plans: { name: string; description: string; priceInr: number; durationDays: number }[];
  faqs: { question: string; answer: string }[];
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

const STOPWORDS = new Set([
  "the",
  "and",
  "are",
  "you",
  "have",
  "for",
  "what",
  "how",
  "can",
  "does",
  "your",
  "this",
  "with",
  "any",
  "where",
  "when",
  "who",
  "from",
  "that",
  "there",
  "they",
  "but",
]);

function scoreOverlap(query: string, target: string): number {
  const qTokens = tokenize(query).filter((t) => !STOPWORDS.has(t));
  const tTokens = new Set(tokenize(target));
  if (qTokens.length === 0) return 0;
  let hits = 0;
  for (const t of qTokens) if (tTokens.has(t)) hits++;
  return hits / qTokens.length;
}

function formatHours(raw: string): string {
  if (!raw) return "";
  try {
    const v = JSON.parse(raw);
    if (typeof v === "object" && v !== null) {
      return Object.entries(v as Record<string, string>)
        .map(([day, time]) => `${day}: ${time}`)
        .join("\n");
    }
    if (typeof v === "string") return v;
  } catch {
    return raw;
  }
  return raw;
}

function pricing(plans: BusinessForChat["plans"]): string {
  if (plans.length === 0) return "";
  return plans
    .map((p) => {
      const dur =
        p.durationDays === 30
          ? "/month"
          : p.durationDays === 365
            ? "/year"
            : p.durationDays === 90
              ? "/quarter"
              : ` for ${p.durationDays} days`;
      return `• ${p.name}: ₹${p.priceInr}${dur}${p.description ? ` — ${p.description}` : ""}`;
    })
    .join("\n");
}

export function answerQuery(query: string, biz: BusinessForChat): string {
  const q = query.toLowerCase().trim();
  if (!q) return biz.chatGreeting || `Hi! Ask me about ${biz.name}.`;

  // FAQ match first — owners customised this content.
  let bestFaq: { score: number; answer: string } | null = null;
  for (const f of biz.faqs) {
    const s = Math.max(scoreOverlap(q, f.question), scoreOverlap(q, f.answer) * 0.5);
    if (!bestFaq || s > bestFaq.score) bestFaq = { score: s, answer: f.answer };
  }
  if (bestFaq && bestFaq.score >= 0.5) return bestFaq.answer;

  // Intent matching on structured fields.
  if (/(price|cost|fee|charge|how much|plan|membership|joining|monthly|yearly)/.test(q)) {
    const p = pricing(biz.plans);
    if (p) return `Here are our membership plans:\n${p}`;
    return "Plans are being finalised. Please leave your contact below and we'll reach out.";
  }
  if (/(hour|time|open|close|when|timing|schedule)/.test(q)) {
    const h = formatHours(biz.hours);
    if (h) return `Our hours:\n${h}`;
    return "Hours aren't listed yet — please call or message us for current timing.";
  }
  if (/(where|address|location|reach|located|directions|map)/.test(q)) {
    const parts = [biz.address, biz.city].filter(Boolean);
    if (parts.length) return `We're at: ${parts.join(", ")}`;
    return "Address coming soon — message us for directions.";
  }
  if (/(call|phone|whatsapp|contact|number|email|reach you)/.test(q)) {
    const lines: string[] = [];
    if (biz.phone) lines.push(`Phone: ${biz.phone}`);
    if (biz.whatsapp) lines.push(`WhatsApp: ${biz.whatsapp}`);
    if (biz.email) lines.push(`Email: ${biz.email}`);
    if (lines.length) return lines.join("\n");
    return "Use the membership form below and we'll reach out.";
  }
  if (/(facility|amenit|equipment|offer|service|feature|what.*have)/.test(q)) {
    const a = parseJsonArray(biz.amenities);
    if (a.length) return `What we offer:\n${a.map((x) => `• ${x}`).join("\n")}`;
    return biz.description || "Send us a message — happy to walk you through what we offer.";
  }
  if (/(about|who|tell me|info|story|what is)/.test(q)) {
    if (biz.description) return biz.description;
    if (biz.tagline) return biz.tagline;
    return `${biz.name} — ${biz.category}.`;
  }
  if (/(trial|free|visit|tour|drop in|first time)/.test(q)) {
    return "We'd love to host you for a visit — drop your number in the membership form below and we'll set it up.";
  }
  if (/(hi|hello|hey|namaste|good (morning|evening|afternoon))/.test(q)) {
    return biz.chatGreeting || `Hi! Welcome to ${biz.name}. How can I help?`;
  }

  // Fallback — fuzzier FAQ match.
  if (bestFaq && bestFaq.score >= 0.25) return bestFaq.answer;

  return `I don't have an answer for that yet. You can reach ${biz.name} directly${
    biz.phone ? ` at ${biz.phone}` : ""
  }${biz.whatsapp ? ` (WhatsApp: ${biz.whatsapp})` : ""}, or use the membership form below.`;
}
