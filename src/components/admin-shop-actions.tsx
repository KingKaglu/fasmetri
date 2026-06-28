"use client";

import { Play, Power } from "lucide-react";
import { useState } from "react";

export function AdminShopActions({ id, enabled, needsConfiguration }: { id: string; enabled: boolean; needsConfiguration: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"toggle" | "scrape" | null>(null);

  async function toggle() {
    setBusy("toggle");
    const response = await fetch(`/api/admin/shops/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setMessage(response.ok ? "მაღაზია განახლდა. სტატუსის სანახავად გვერდი განაახლე." : "განახლება ვერ შესრულდა.");
    setBusy(null);
  }

  async function scrape() {
    setBusy("scrape");
    const response = await fetch(`/api/admin/scrape/${id}`, { method: "POST" });
    setMessage(response.ok ? "სკრეპის გაშვება მიღებულია." : "სკრეპის გაშვება ვერ შესრულდა.");
    setBusy(null);
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={busy !== null}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-sm font-black text-[var(--brand)] hover:border-[#0a0a0a] disabled:cursor-wait disabled:opacity-70"
        >
          <Power className="size-4" />
          {busy === "toggle" ? "მუშავდება..." : enabled ? "გამორთვა" : "ჩართვა"}
        </button>
        <button
          type="button"
          disabled={needsConfiguration || busy !== null}
          onClick={scrape}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#0a0a0a] px-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(10,10,10,0.16)] hover:bg-black disabled:cursor-not-allowed disabled:bg-[#9bb3ae]"
        >
          <Play className="size-4 text-[var(--accent)]" />
          {busy === "scrape" ? "იშვება..." : "გაშვება"}
        </button>
      </div>
      {message ? <p className="rounded-xl border border-[#ededee] bg-[#fafafa] px-3 py-2 text-xs font-bold text-[var(--muted-strong)]">{message}</p> : null}
    </div>
  );
}
