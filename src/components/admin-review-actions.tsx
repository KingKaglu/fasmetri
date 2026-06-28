"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Check, Loader2, Wand2, X } from "lucide-react";

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
        setError(payload?.error ?? "áƒ›áƒáƒ¥áƒ›áƒ”áƒ“áƒ”áƒ‘áƒ áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
        setBusy(null);
      }
    } catch {
      setError("áƒ¥áƒ¡áƒ”áƒšáƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ â€” áƒ¡áƒªáƒáƒ“áƒ” áƒ—áƒáƒ•áƒ˜áƒ“áƒáƒœ.");
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => act("approve")}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#1c8b43] px-4 text-sm font-black text-white hover:bg-[#157035] disabled:cursor-wait disabled:opacity-60"
        >
          {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          áƒ“áƒáƒ“áƒáƒ¡áƒ¢áƒ£áƒ áƒ”áƒ‘áƒ
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => act("reject")}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#d4d4d8] bg-[#f4f4f5] px-4 text-sm font-black text-[var(--danger)] hover:border-[var(--danger)] disabled:cursor-wait disabled:opacity-60"
        >
          {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          áƒ£áƒáƒ áƒ§áƒáƒ¤áƒ
        </button>
      </div>
      {error ? <p className="rounded-xl border border-[#d4d4d8] bg-[#f4f4f5] px-3 py-2 text-xs font-bold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function AutoTriageButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function run() {
    if (!window.confirm("áƒ’áƒáƒ”áƒ¨áƒ•áƒáƒ¡ auto-triage? áƒ™áƒáƒœáƒ¤áƒšáƒ˜áƒ¥áƒ¢áƒ”áƒ‘áƒ˜ áƒ£áƒáƒ áƒ§áƒáƒ¤áƒ, model code/70+ match-áƒ”áƒ‘áƒ˜ áƒ“áƒáƒ“áƒáƒ¡áƒ¢áƒ£áƒ áƒ“áƒ”áƒ‘áƒ.")) return;
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
        setStatus(`áƒ“áƒáƒ“áƒáƒ¡áƒ¢áƒ£áƒ áƒ“áƒ ${payload?.approved ?? 0}, áƒ£áƒáƒ áƒ§áƒáƒ¤áƒ˜áƒšáƒ˜áƒ ${payload?.rejected ?? 0}, áƒ“áƒáƒ áƒ©áƒ ${payload?.kept ?? 0}, áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ ${payload?.failed ?? 0}.`);
        router.refresh();
      } else {
        setStatus(payload?.error ?? "Auto-triage áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
      }
    } catch {
      setStatus("áƒ¥áƒ¡áƒ”áƒšáƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ â€” áƒ¡áƒªáƒáƒ“áƒ” áƒ—áƒáƒ•áƒ˜áƒ“áƒáƒœ.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#c8d7bd] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#151713] disabled:cursor-wait disabled:opacity-60"
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
    if (!window.confirm(`áƒ“áƒáƒáƒ“áƒáƒ¡áƒ¢áƒ£áƒ áƒ áƒ§áƒ•áƒ”áƒšáƒ pending match confidence >= ${minConfidence}%?`)) return;
    setBusy(true);
    setStatus("");
    const response = await fetch("/api/admin/review/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minConfidence, category }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setStatus(`áƒ“áƒáƒ“áƒáƒ¡áƒ¢áƒ£áƒ áƒ“áƒ ${payload?.approved ?? 0}, áƒ’áƒáƒ›áƒáƒ¢áƒáƒ•áƒ“áƒ ${payload?.skipped ?? 0}, áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ ${payload?.failed ?? 0}.`);
      router.refresh();
    } else {
      setStatus(payload?.error ?? "Bulk áƒ“áƒáƒ“áƒáƒ¡áƒ¢áƒ£áƒ áƒ”áƒ‘áƒ áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#c8d7bd] bg-white px-3 text-sm font-black text-[var(--brand)]">
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
        className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#151713] px-4 text-sm font-black text-white hover:bg-black disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "áƒ›áƒ£áƒ¨áƒáƒ•áƒ“áƒ”áƒ‘áƒ..." : "Bulk áƒ“áƒáƒ“áƒáƒ¡áƒ¢áƒ£áƒ áƒ”áƒ‘áƒ"}
      </button>
      {status ? <p className="text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </form>
  );
}
