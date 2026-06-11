"use client";

import { useState } from "react";
import { Eraser, Loader2, Play, Wand2 } from "lucide-react";

function useTrigger() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function trigger(workflow: string, mode?: "prices" | "full") {
    setBusy(true);
    setStatus("");
    const response = await fetch("/api/admin/sync/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflow, mode }),
    });
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? "გაშვება მიღებულია — GitHub Actions-ში დაიწყება წუთში." : payload?.error ?? "გაშვება ვერ შესრულდა.");
    setBusy(false);
  }

  return { busy, status, trigger };
}

export function SyncTriggerButtons({ workflow }: { workflow: string }) {
  const { busy, status, trigger } = useTrigger();

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => trigger(workflow, "prices")}
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-[#151713] px-3 text-xs font-black text-white hover:bg-black disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5 text-[var(--accent)]" />}
          ფასების სინქი
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => trigger(workflow, "full")}
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-[#c8d7bd] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#151713] disabled:cursor-wait disabled:opacity-60"
        >
          <Play className="size-3.5" />
          სრული სინქი
        </button>
      </div>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </div>
  );
}

export function MatcherTriggerButton() {
  const { busy, status, trigger } = useTrigger();

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => trigger("match-products.yml")}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#151713] px-4 text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4 text-[var(--accent)]" />}
        Matcher-ის გაშვება
      </button>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </div>
  );
}

export function StaleOfferCleanupButton({ staleCount }: { staleCount: number }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function cleanup() {
    if (!window.confirm(`გამოირთოს ${staleCount} შეთავაზება, რომელიც 7 დღეა აღარ ჩანს sync-ში?`)) return;
    setBusy(true);
    setStatus("");
    const response = await fetch("/api/admin/offers/cleanup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 7, dryRun: false }),
    });
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? `გამოირთო ${payload?.deactivated ?? 0} შეთავაზება.` : payload?.error ?? "ვერ შესრულდა.");
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy || staleCount === 0}
        onClick={cleanup}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#ffdca6] bg-[var(--warn-soft)] px-4 text-sm font-black text-[var(--warn)] hover:border-[var(--warn)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
        ძველი შეთავაზებების გასუფთავება ({staleCount})
      </button>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </div>
  );
}
