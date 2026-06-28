"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";

// Keyboard driver for the review queue. Rows are server-rendered with
// data-review-row={id}; this component highlights the selected row via the
// data-selected attribute (styled with Tailwind data-variants on the row) and
// fires the same approve/reject API the row buttons use.
export function ReviewKeyboardNav({ matchIds }: { matchIds: string[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const indexRef = useRef(index);
  const busyRef = useRef(busy);
  indexRef.current = index;
  busyRef.current = busy;
  const idsRef = useRef(matchIds);
  idsRef.current = matchIds;

  useEffect(() => {
    function select(next: number) {
      const ids = idsRef.current;
      if (!ids.length) return;
      const clamped = Math.max(0, Math.min(ids.length - 1, next));
      setIndex(clamped);
      for (const el of document.querySelectorAll<HTMLElement>("[data-review-row]")) {
        el.dataset.selected = el.dataset.reviewRow === ids[clamped] ? "true" : "false";
      }
      document
        .querySelector(`[data-review-row="${ids[clamped]}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    async function decide(action: "approve" | "reject") {
      const ids = idsRef.current;
      const id = ids[indexRef.current];
      if (!id || busyRef.current) return;
      setBusy(true);
      try {
        const response = await fetch(`/api/admin/review/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (response.ok) router.refresh();
      } finally {
        setBusy(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        select(indexRef.current + 1);
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        select(indexRef.current - 1);
      } else if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        void decide("approve");
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        void decide("reject");
      }
    }

    select(0);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Re-run when the queue contents change (after refresh) to re-highlight.
  }, [matchIds.join("|"), router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!matchIds.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 -translate-x-1/2 lg:bottom-5">
      <div className="flex items-center gap-2 rounded-full border border-[#27272a] bg-[#0a0a0a]/95 px-4 py-2 text-[11px] font-black text-white/85 shadow-[0_14px_34px_rgba(10,10,10,0.35)]">
        <Keyboard className="size-3.5 text-[var(--accent)]" />
        <span className="tabular-nums">{index + 1}/{matchIds.length}</span>
        <span className="text-white/40">·</span>
        <kbd className="rounded bg-white/12 px-1.5 py-0.5">↑↓</kbd> ნავიგაცია
        <kbd className="rounded bg-white/12 px-1.5 py-0.5">A</kbd> დადასტურება
        <kbd className="rounded bg-white/12 px-1.5 py-0.5">R</kbd> უარყოფა
        {busy ? <span className="text-[var(--accent)]">…</span> : null}
      </div>
    </div>
  );
}
