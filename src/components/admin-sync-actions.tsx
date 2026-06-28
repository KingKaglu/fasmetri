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
    setStatus(response.ok ? "áƒ’áƒáƒ¨áƒ•áƒ”áƒ‘áƒ áƒ›áƒ˜áƒ¦áƒ”áƒ‘áƒ£áƒšáƒ˜áƒ â€” GitHub Actions-áƒ¨áƒ˜ áƒ“áƒáƒ˜áƒ¬áƒ§áƒ”áƒ‘áƒ áƒ¬áƒ£áƒ—áƒ¨áƒ˜." : payload?.error ?? "áƒ’áƒáƒ¨áƒ•áƒ”áƒ‘áƒ áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
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
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-[#0a0a0a] px-3 text-xs font-black text-white hover:bg-black disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5 text-[var(--accent)]" />}
          áƒ¤áƒáƒ¡áƒ”áƒ‘áƒ˜áƒ¡ áƒ¡áƒ˜áƒœáƒ¥áƒ˜
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => trigger(workflow, "full")}
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
        >
          <Play className="size-3.5" />
          áƒ¡áƒ áƒ£áƒšáƒ˜ áƒ¡áƒ˜áƒœáƒ¥áƒ˜
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
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#0a0a0a] px-4 text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4 text-[var(--accent)]" />}
        Matcher-áƒ˜áƒ¡ áƒ’áƒáƒ¨áƒ•áƒ”áƒ‘áƒ
      </button>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </div>
  );
}

export function StaleOfferCleanupButton({ staleCount }: { staleCount: number }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function cleanup() {
    if (!window.confirm(`áƒ’áƒáƒ›áƒáƒ˜áƒ áƒ—áƒáƒ¡ ${staleCount} áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ, áƒ áƒáƒ›áƒ”áƒšáƒ˜áƒª 7 áƒ“áƒ¦áƒ”áƒ áƒáƒ¦áƒáƒ  áƒ©áƒáƒœáƒ¡ sync-áƒ¨áƒ˜?`)) return;
    setBusy(true);
    setStatus("");
    const response = await fetch("/api/admin/offers/cleanup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 7, dryRun: false }),
    });
    const payload = await response.json().catch(() => null);
    setStatus(response.ok ? `áƒ’áƒáƒ›áƒáƒ˜áƒ áƒ—áƒ ${payload?.deactivated ?? 0} áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ.` : payload?.error ?? "áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy || staleCount === 0}
        onClick={cleanup}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#d4d4d8] bg-[var(--warn-soft)] px-4 text-sm font-black text-[var(--warn)] hover:border-[var(--warn)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
        áƒ«áƒ•áƒ”áƒšáƒ˜ áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ”áƒ‘áƒ˜áƒ¡ áƒ’áƒáƒ¡áƒ£áƒ¤áƒ—áƒáƒ•áƒ”áƒ‘áƒ ({staleCount})
      </button>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </div>
  );
}
