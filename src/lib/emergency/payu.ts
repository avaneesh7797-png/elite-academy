import crypto from "crypto";

export type PayuMode = "test" | "live";

export type PayuConfig = {
  key: string;
  salt: string;
  mode: PayuMode;
  baseUrl: string;
};

export function getPayuConfig(): PayuConfig | null {
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!key || !salt) return null;
  const mode = (process.env.PAYU_MODE === "live" ? "live" : "test") as PayuMode;
  const baseUrl = mode === "live" ? "https://secure.payu.in" : "https://test.payu.in";
  return { key, salt, mode, baseUrl };
}

export type PayuCheckoutParams = {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
};

export function makeRequestHash(cfg: PayuConfig, p: PayuCheckoutParams): string {
  const empties = Array(10).fill("").join("|");
  const raw = `${cfg.key}|${p.txnid}|${p.amount}|${p.productinfo}|${p.firstname}|${p.email}|${empties}|${cfg.salt}`;
  return crypto.createHash("sha512").update(raw).digest("hex");
}

export function verifyResponseHash(
  cfg: PayuConfig,
  body: Record<string, string>
): boolean {
  const provided = body.hash;
  if (!provided) return false;
  const status = body.status ?? "";
  const empties = Array(10).fill("").join("|");
  const raw = `${cfg.salt}|${status}|${empties}|${body.email ?? ""}|${body.firstname ?? ""}|${body.productinfo ?? ""}|${body.amount ?? ""}|${body.txnid ?? ""}|${cfg.key}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
}

export function newTxnId(prefix = "emrg"): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export type Plan = "monthly" | "yearly";

export const PLANS: Record<Plan, { amount: number; label: string; periodDays: number; productinfo: string }> = {
  monthly: { amount: 49, label: "Premium · Monthly", periodDays: 30, productinfo: "EmergencyPremiumMonthly" },
  yearly: { amount: 499, label: "Premium · Yearly", periodDays: 365, productinfo: "EmergencyPremiumYearly" },
};
