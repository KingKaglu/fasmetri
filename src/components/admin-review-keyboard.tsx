"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Keyboard } from "lucide-react";

// Keyboard driver for the review queue. Rows are server-rendered with
// data-review-row={id}; this component highlights the selected row via the
// data-selected attribute (styled with Tailwind data-variants on the row) and
// fires the same approve/reject API the row buttons use.
export function ReviewKeyboardNav({ matchIds }: { matchIds: string[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // A new queue (after refresh) starts again at the first row. Adjusted during
  // render instead of in an effect.
  const queueKey = matchIds.join("|");
  const [syncedQueue, setSyncedQueue] = useState(queueKey);
  if (syncedQueue !== queueKey) {
    setSyncedQueue(queueKey);
    setIndex(0);
  }

  // Highlight + scroll the selected row. Rows are server-rendered, so this is
  // DOM synchronisation, which is what effects are for.
  useEffect(() => {
    const id = matchIds[index];
    if (!id) return;
    for (const el of document.querySelectorAll<HTMLElement>("[data-review-row]")) {
      el.dataset.selected = el.dataset.reviewRow === id ? "true" : "false";
    }
    document.querySelector(`[data-review-row="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [index, queueKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function select(next: number) {
    if (!matchIds.length) return;
    setIndex(Math.max(0, Math.min(matchIds.length - 1, next)));
  }

  async function decide(action: "approve" | "reject") {
    const id = matchIds[index];
    if (!id || busy) return;
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

  // Always sees the latest index/busy/queue without re-binding the listener.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      select(index + 1);
    } else if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      select(index - 1);
    } else if (event.key === "a" || event.key === "A") {
      event.preventDefault();
      void decide("approve");
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      void decide("reject");
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (!matchIds.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 -translate-x-1/2 lg:bottom-5">
      <div className="flex items-center gap-2 rounded-full border border-on-ink-line bg-ink-surface/95 px-4 py-2 text-[11px] font-black text-on-ink-soft shadow-[0_14px_34px_rgba(10,10,10,0.35)]">
        <Keyboard className="size-3.5 text-[var(--accent)]" />
        <span className="tabular-nums">{index + 1}/{matchIds.length}</span>
        <span className="text-on-ink-subtle">·</span>
        <kbd className="rounded-sm bg-on-ink-fill px-1.5 py-0.5">↑↓</kbd> ნავიგაცია
        <kbd className="rounded-sm bg-on-ink-fill px-1.5 py-0.5">A</kbd> დადასტურება
        <kbd className="rounded-sm bg-on-ink-fill px-1.5 py-0.5">R</kbd> უარყოფა
        {busy ? <span className="text-[var(--accent)]">…</span> : null}
      </div>
    </div>
  );
}
