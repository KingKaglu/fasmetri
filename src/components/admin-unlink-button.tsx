"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Unlink } from "lucide-react";

export function UnlinkOfferButton({ offerId, offerTitle }: { offerId: string; offerTitle: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function unlink() {
    if (!window.confirm(`გავაცალკეო ეს შეთავაზება საკუთარ პროდუქტად?\n\n${offerTitle}`)) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/offers/${offerId}/unlink`, { method: "POST" });
    if (response.ok) {
      router.refresh();
    } else {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Unlink ვერ შესრულდა.");
    }
    setBusy(false);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={unlink}
        className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-[#f3bbb3] bg-[#fff1ef] px-3 text-xs font-black text-[var(--danger)] hover:border-[var(--danger)] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
        Unlink
      </button>
      {error ? <span className="text-xs font-bold text-[var(--danger)]">{error}</span> : null}
    </span>
  );
}
