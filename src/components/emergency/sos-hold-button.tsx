"use client";

import { useEffect, useRef, useState } from "react";

const HOLD_MS = 3000;

type Props = {
  label: string;
  sublabel?: string;
  color: "red" | "orange" | "blue";
  onActivate: () => void;
  disabled?: boolean;
};

const COLORS = {
  red: {
    base: "bg-red-600 border-red-400",
    active: "bg-red-500",
    ring: "stroke-red-200",
  },
  orange: {
    base: "bg-orange-600 border-orange-400",
    active: "bg-orange-500",
    ring: "stroke-orange-200",
  },
  blue: {
    base: "bg-blue-600 border-blue-400",
    active: "bg-blue-500",
    ring: "stroke-blue-200",
  },
} as const;

export function SosHoldButton({ label, sublabel, color, onActivate, disabled }: Props) {
  const [progress, setProgress] = useState(0); // 0..1
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const tick = (ts: number) => {
    if (startRef.current == null) return;
    const elapsed = ts - startRef.current;
    const p = Math.min(1, elapsed / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      if (!firedRef.current) {
        firedRef.current = true;
        cancel();
        onActivate();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (disabled || firedRef.current) return;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(40);
      } catch {}
    }
  };

  const cancel = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    if (!firedRef.current) setProgress(0);
  };

  useEffect(() => () => cancel(), []);

  const c = COLORS[color];
  const RADIUS = 110;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = CIRC * (1 - progress);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      className={`relative flex h-64 w-64 select-none items-center justify-center rounded-full border-4 text-white shadow-2xl transition-transform active:scale-95 disabled:opacity-50 ${
        progress > 0 ? c.active : c.base
      }`}
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      <svg
        className="pointer-events-none absolute inset-0 -rotate-90"
        viewBox="0 0 240 240"
        aria-hidden
      >
        <circle
          cx="120"
          cy="120"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          className={c.ring}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dash}
          style={{ transition: progress === 0 ? "stroke-dashoffset 200ms" : "none" }}
        />
      </svg>
      <div className="pointer-events-none flex flex-col items-center px-4 text-center">
        <span className="text-2xl font-bold leading-tight">{label}</span>
        {sublabel && <span className="mt-2 text-sm font-medium opacity-90">{sublabel}</span>}
        <span className="mt-3 text-xs uppercase tracking-widest opacity-80">
          {progress === 0 ? "Hold 3 sec" : progress < 1 ? `${Math.ceil((1 - progress) * 3)}…` : "Calling"}
        </span>
      </div>
    </button>
  );
}
