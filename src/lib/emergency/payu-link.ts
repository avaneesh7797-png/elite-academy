export const PAYU_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_PAYU_PAYMENT_LINK || "https://u.payu.in/7I3R5WXiRzDN";

export const PAYU_PAYMENT_AMOUNT = process.env.NEXT_PUBLIC_PAYU_PAYMENT_AMOUNT || "2000";

export const PAYU_PAYMENT_LABEL =
  process.env.NEXT_PUBLIC_PAYU_PAYMENT_LABEL || "Premium · Lifetime";

export const PAYU_PAYMENT_PERIOD_DAYS = Number(
  process.env.NEXT_PUBLIC_PAYU_PAYMENT_PERIOD_DAYS || 36500
);

export const IS_LIFETIME = PAYU_PAYMENT_PERIOD_DAYS >= 365 * 50;
