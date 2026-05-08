import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function timeRemaining(endsAt: Date | string) {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return { ended: true, label: "Ended" };

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let label: string;
  if (days > 0) label = `${days}d ${hours}h`;
  else if (hours > 0) label = `${hours}h ${minutes}m`;
  else if (minutes > 0) label = `${minutes}m ${seconds}s`;
  else label = `${seconds}s`;

  return { ended: false, label, days, hours, minutes, seconds };
}

export function minNextBid(currentPrice: number, startPrice: number, hasBids: boolean) {
  if (!hasBids) return startPrice;
  if (currentPrice < 1) return currentPrice + 0.25;
  if (currentPrice < 10) return currentPrice + 0.5;
  if (currentPrice < 100) return currentPrice + 1;
  if (currentPrice < 500) return currentPrice + 5;
  if (currentPrice < 1000) return currentPrice + 10;
  return currentPrice + 25;
}
