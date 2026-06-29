"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Check, ExternalLink, Loader2, Wand2, X } from "lucide-react";

// Opens the store page and the existing public product page in two tabs at
// once, so a reviewer can eyeball both before deciding. Pure client-side.
export function OpenBothButton({ storeUrl, publicUrl }: { storeUrl: string; publicUrl?: string | null }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.open(storeUrl, "_blank", "noopener,noreferrer");
        if (publicUrl) window.open(publicUrl, "_blank", "noopener,noreferrer");
      }}
      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-xs font-black text-[var(--muted-strong)] hover:border-[#0a0a0a]"
    >
      <ExternalLink className="size-3.5" />
      ორივეს გახსნა
    </button>
  );
}

export function ReviewRowActions({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function act(action: "approve" | "reject") {
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/admin/review/${matchId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "მოქმედება ვერ შესრულდა.");
        setBusy(null);
      }
    } catch {
      setError("ქსელის შეცდომა — სცადე თავიდან.");
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => act("approve")}
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-[#1c8b43] px-4 text-sm font-black text-white hover:bg-[#157035] disabled:cursor-wait disabled:opacity-60"
      >
        {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        დადასტურება
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => act("reject")}
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-[#d4d4d8] bg-[#f4f4f5] px-4 text-sm font-black text-[var(--danger)] hover:border-[var(--danger)] disabled:cursor-wait disabled:opacity-60"
      >
        {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        უარყოფა
      </button>
      {error ? <p className="rounded-xl border border-[#d4d4d8] bg-[#f4f4f5] px-3 py-2 text-xs font-bold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function AutoTriageButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function run() {
    if (!window.confirm("გაეშვას auto-triage? კონფლიქტები უარყოფა, model code/70+ match-ები დადასტურდება.")) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/review/auto-triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setStatus(`დადასტურდა ${payload?.approved ?? 0}, უარყოფილია ${payload?.rejected ?? 0}, დარჩა ${payload?.kept ?? 0}, ვერ შესრულდა ${payload?.failed ?? 0}.`);
        router.refresh();
      } else {
        setStatus(payload?.error ?? "Auto-triage ვერ შესრულდა.");
      }
    } catch {
      setStatus("ქსელის შეცდომა — სცადე თავიდან.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#e4e4e7] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
        Run Auto-Triage
      </button>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </div>
  );
}

export function BulkApproveForm({ category }: { category?: "mobiles" | "laptops" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minConfidence = Number(new FormData(event.currentTarget).get("minConfidence"));
    if (!window.confirm(`დაადასტურო ყველა pending match confidence >= ${minConfidence}%?`)) return;
    setBusy(true);
    setStatus("");
    const response = await fetch("/api/admin/review/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minConfidence, category }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setStatus(`დადასტურდა ${payload?.approved ?? 0}, გამოტოვდა ${payload?.skipped ?? 0}, ვერ შესრულდა ${payload?.failed ?? 0}.`);
      router.refresh();
    } else {
      setStatus(payload?.error ?? "Bulk დადასტურება ვერ შესრულდა.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-sm font-black text-[var(--brand)]">
        min confidence
        <input
          name="minConfidence"
          type="number"
          min={50}
          max={100}
          defaultValue={80}
          className="w-16 bg-transparent text-right outline-none"
        />
        %
      </label>
      <button
        disabled={busy}
        className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0a0a0a] px-4 text-sm font-black text-white hover:bg-black disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "მუშავდება..." : "Bulk დადასტურება"}
      </button>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </form>
  );
}
