export const PAYU_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_PAYU_PAYMENT_LINK || "https://u.payu.in/sIgRPWiRGhbM";

export const PAYU_PAYMENT_AMOUNT = process.env.NEXT_PUBLIC_PAYU_PAYMENT_AMOUNT || "499";

export const PAYU_PAYMENT_LABEL =
  process.env.NEXT_PUBLIC_PAYU_PAYMENT_LABEL || "Premium · 1 year";

export const PAYU_PAYMENT_PERIOD_DAYS = Number(
  process.env.NEXT_PUBLIC_PAYU_PAYMENT_PERIOD_DAYS || 365
);
