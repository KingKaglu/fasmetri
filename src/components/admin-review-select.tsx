"use client";

import { useRouter } from "next/navigation";
import { ReactNode, createContext, useContext, useMemo, useState } from "react";
import { Check, CheckSquare, Loader2, Square, X } from "lucide-react";

type SelectionContextValue = {
  selected: Set<string>;
  toggle: (id: string) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function ReviewSelectCheckbox({ matchId }: { matchId: string }) {
  const ctx = useContext(SelectionContext);
  if (!ctx) return null;
  const checked = ctx.selected.has(matchId);
  return (
    <button
      type="button"
      onClick={() => ctx.toggle(matchId)}
      aria-pressed={checked}
      title={checked ? "მონიშვნის მოხსნა" : "მონიშვნა"}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl border transition ${
        checked ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#e4e4e7] bg-white text-[var(--muted)] hover:border-[#0a0a0a]"
      }`}
    >
      {checked ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
    </button>
  );
}

// Wraps the server-rendered review rows: tracks selection and shows a sticky
// bulk action bar. Actions loop the existing per-match PATCH endpoint.
export function ReviewSelectionProvider({ allIds, children }: { allIds: string[]; children: ReactNode }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [progress, setProgress] = useState("");

  const value = useMemo<SelectionContextValue>(
    () => ({
      selected,
      toggle: (id) =>
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    }),
    [selected],
  );

  async function act(action: "approve" | "reject") {
    const ids = [...selected];
    if (!ids.length) return;
    const label = action === "approve" ? "დაადასტურო" : "უარყო";
    if (!window.confirm(`${label} ${ids.length} მონიშნული match?`)) return;
    setBusy(action);
    let done = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const response = await fetch(`/api/admin/review/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (response.ok) done += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
      setProgress(`${done + failed}/${ids.length}...`);
    }
    setProgress(failed ? `შესრულდა ${done}, ვერ შესრულდა ${failed}.` : `შესრულდა ${done}.`);
    setSelected(new Set());
    setBusy(null);
    router.refresh();
  }

  return (
    <SelectionContext.Provider value={value}>
      {children}
      {selected.size > 0 || progress ? (
        <div className="sticky bottom-4 z-40 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl border border-[#27272a] bg-[#0a0a0a] px-4 py-3 text-white shadow-[0_18px_44px_rgba(10,10,10,0.35)]">
          <span className="text-sm font-black tabular-nums">{selected.size} მონიშნული</span>
          <button
            type="button"
            disabled={busy !== null || selected.size === 0}
            onClick={() => act("approve")}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#1c8b43] px-4 text-sm font-black text-white hover:bg-[#157035] disabled:cursor-wait disabled:opacity-60"
          >
            {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            დადასტურება
          </button>
          <button
            type="button"
            disabled={busy !== null || selected.size === 0}
            onClick={() => act("reject")}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/25 px-4 text-sm font-black text-white hover:border-white disabled:cursor-wait disabled:opacity-60"
          >
            {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            უარყოფა
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setSelected(new Set(allIds))}
            className="text-xs font-black text-white/70 underline-offset-2 hover:text-white hover:underline"
          >
            ყველას მონიშვნა ({allIds.length})
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setSelected(new Set());
              setProgress("");
            }}
            className="text-xs font-black text-white/70 underline-offset-2 hover:text-white hover:underline"
          >
            გასუფთავება
          </button>
          {progress ? <span className="text-xs font-bold text-white/70">{progress}</span> : null}
        </div>
      ) : null}
    </SelectionContext.Provider>
  );
}
