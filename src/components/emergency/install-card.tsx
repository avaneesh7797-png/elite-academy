"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "emergency:install-prompt-dismissed:v1";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navStandalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export function InstallCard() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) setDismissed(true);
    } catch {}

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    if (isIosSafari()) setShowIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  if (installed || dismissed) return null;
  if (!promptEvent && !showIosHint) return null;

  return (
    <div className="relative mt-3 rounded-xl border border-blue-700/40 bg-gradient-to-br from-blue-900/30 to-zinc-900 p-3">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
          {showIosHint ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </div>
        <div className="flex-1 pr-6 text-sm">
          <div className="font-semibold">Install Emergency</div>
          {showIosHint ? (
            <div className="text-xs text-zinc-400">
              Tap <Share2 className="inline h-3 w-3" /> Share &rarr; Add to Home Screen
            </div>
          ) : (
            <div className="text-xs text-zinc-400">Add it to your home screen for one-tap access.</div>
          )}
        </div>
        {!showIosHint && (
          <button
            onClick={install}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
