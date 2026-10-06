"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// Product share button: native share sheet where available (mobile), clipboard
// copy fallback on desktop with a brief "copied" confirmation.
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed the sheet or share failed — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing else to do.
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="გაზიარება"
      title="გაზიარება"
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? "დაკოპირდა" : "გაზიარება"}
    </button>
  );
}
