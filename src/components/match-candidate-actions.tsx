"use client";

import { Check, Lock, X } from "lucide-react";
import { useState } from "react";

export function MatchCandidateActions({ id }: { id: string }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"confirm" | "reject" | "lock" | null>(null);

  async function review(action: "confirm" | "reject" | "lock") {
    setBusy(action);
    const response = await fetch(`/api/admin/matching/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setStatus(
      response.ok
        ? action === "confirm"
          ? "áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ áƒ›áƒ˜áƒ”áƒ‘áƒ áƒžáƒ áƒáƒ“áƒ£áƒ¥áƒ¢áƒ¡."
          : action === "lock"
            ? "áƒ’áƒáƒ“áƒáƒ¬áƒ§áƒ•áƒ”áƒ¢áƒ˜áƒšáƒ”áƒ‘áƒ áƒ£áƒáƒ áƒ§áƒáƒ¤áƒ˜áƒšáƒ˜ áƒ“áƒ áƒ“áƒáƒ‘áƒšáƒáƒ™áƒ˜áƒšáƒ˜áƒ."
            : "áƒ™áƒáƒœáƒ“áƒ˜áƒ“áƒáƒ¢áƒ˜ áƒ£áƒáƒ áƒ§áƒáƒ¤áƒ˜áƒšáƒ˜áƒ."
        : "review áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.",
    );
    setBusy(null);
  }

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => review("confirm")}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0a0a0a] px-3 text-sm font-black text-white hover:bg-black disabled:cursor-wait disabled:opacity-70"
        >
          <Check className="size-4 text-[var(--accent)]" />
          áƒ˜áƒ’áƒ˜áƒ•áƒ” áƒžáƒ áƒáƒ“áƒ£áƒ¥áƒ¢áƒ˜áƒ
        </button>
        <button
          type="button"
          onClick={() => review("reject")}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#d4d4d8] bg-[#f4f4f5] px-3 text-sm font-black text-[var(--danger)] disabled:cursor-wait disabled:opacity-70"
        >
          <X className="size-4" />
          áƒ£áƒáƒ áƒ§áƒáƒ¤áƒ
        </button>
        <button
          type="button"
          onClick={() => review("lock")}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-sm font-black text-[var(--muted-strong)] disabled:cursor-wait disabled:opacity-70"
        >
          <Lock className="size-4" />
          áƒ£áƒáƒ áƒ§áƒáƒ¤áƒ áƒ“áƒ áƒ©áƒáƒ™áƒ”áƒ¢áƒ•áƒ
        </button>
      </div>
      {status ? <p className="rounded-xl border border-[#ededee] bg-[#fafafa] px-3 py-2 text-xs font-bold text-[var(--muted-strong)]">{status}</p> : null}
    </div>
  );
}
