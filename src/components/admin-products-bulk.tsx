"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { GitMerge, Loader2, Trash2, Unlink, X } from "lucide-react";
import { bulkDeleteOrphans, bulkUnlinkProducts, mergeCanonicalProducts } from "@/app/admin/products/actions";

// Bulk selection for /admin/products. Selection order matters for merge:
// the FIRST selected product is the merge target (survivor).

type Selected = { id: string; title: string; activeOffers: number };

type BulkContextValue = {
  selected: Selected[];
  toggle: (item: Selected) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
};

const BulkContext = createContext<BulkContextValue | null>(null);

export function ProductBulkProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Selected[]>([]);
  const toggle = useCallback((item: Selected) => {
    setSelected((current) =>
      current.some((entry) => entry.id === item.id) ? current.filter((entry) => entry.id !== item.id) : [...current, item],
    );
  }, []);
  const clear = useCallback(() => setSelected([]), []);
  const isSelected = useCallback((id: string) => selected.some((entry) => entry.id === id), [selected]);
  const value = useMemo(() => ({ selected, toggle, clear, isSelected }), [selected, toggle, clear, isSelected]);
  return <BulkContext.Provider value={value}>{children}</BulkContext.Provider>;
}

function useBulk() {
  const context = useContext(BulkContext);
  if (!context) throw new Error("ProductBulkProvider missing.");
  return context;
}

export function ProductSelectCheckbox({ id, title, activeOffers }: Selected) {
  const { toggle, isSelected } = useBulk();
  return (
    <input
      type="checkbox"
      aria-label={`არჩევა: ${title}`}
      checked={isSelected(id)}
      onChange={() => toggle({ id, title, activeOffers })}
      onClick={(event) => event.stopPropagation()}
      className="size-4 shrink-0 cursor-pointer accent-[#151713]"
    />
  );
}

export function ProductBulkBar() {
  const router = useRouter();
  const { selected, clear } = useBulk();
  const [busy, setBusy] = useState<"unlink" | "delete" | "merge" | null>(null);
  const [message, setMessage] = useState("");

  if (!selected.length) return null;
  const orphanCount = selected.filter((entry) => entry.activeOffers === 0).length;

  async function run(kind: "unlink" | "delete" | "merge", task: () => Promise<{ ok: boolean; detail?: string; error?: string }>) {
    setBusy(kind);
    setMessage("");
    try {
      const result = await task();
      if (result.ok) {
        setMessage(result.detail ?? "შესრულდა.");
        clear();
        router.refresh();
      } else {
        setMessage(result.error ?? "ვერ შესრულდა.");
      }
    } catch {
      setMessage("ვერ შესრულდა.");
    }
    setBusy(null);
  }

  const button =
    "inline-flex h-9 items-center gap-1.5 rounded-2xl border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-[#151713] bg-[#151713] p-3 text-white shadow-lg">
      <span className="text-xs font-black">{selected.length} არჩეული</span>
      <button
        type="button"
        disabled={busy !== null}
        title="ყველა შეთავაზება გადადის საკუთარ ცალკეულ პროდუქტში (ჯგუფის დაშლა)"
        onClick={() => {
          if (!window.confirm(`დაიშალოს ${selected.length} პროდუქტის ყველა შეთავაზება ცალკეულ პროდუქტებად?`)) return;
          run("unlink", () => bulkUnlinkProducts(selected.map((entry) => entry.id)));
        }}
        className={`${button} border-[#f3bbb3] bg-[#fff1ef] text-[var(--danger)] hover:border-white`}
      >
        {busy === "unlink" ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
        Bulk unlink
      </button>
      <button
        type="button"
        disabled={busy !== null || orphanCount === 0}
        title="წაიშლება მხოლოდ ის არჩეული პროდუქტები, რომლებსაც შეთავაზება არ აქვთ"
        onClick={() => {
          if (!window.confirm(`წაიშალოს ${orphanCount} ობოლი (0 შეთავაზება) პროდუქტი?`)) return;
          run("delete", () => bulkDeleteOrphans(selected.map((entry) => entry.id)));
        }}
        className={`${button} border-[#f3bbb3] bg-[#fff1ef] text-[var(--danger)] hover:border-white`}
      >
        {busy === "delete" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        ობლების წაშლა ({orphanCount})
      </button>
      <button
        type="button"
        disabled={busy !== null || selected.length !== 2}
        title="ზუსტად 2 არჩეული: პირველი რჩება, მეორის შეთავაზებები გადადის მასში"
        onClick={() => {
          const [target, source] = selected;
          if (!window.confirm(`გაერთიანება:\n\n"${source.title}"\n→ გადადის →\n"${target.title}"\n\n(პირველი არჩეული რჩება, მეორე იშლება)`)) return;
          run("merge", () => mergeCanonicalProducts(target.id, source.id));
        }}
        className={`${button} border-[#b8edf2] bg-[var(--aqua-soft)] text-[#087d8f] hover:border-white`}
      >
        {busy === "merge" ? <Loader2 className="size-3.5 animate-spin" /> : <GitMerge className="size-3.5" />}
        გაერთიანება 2→1
      </button>
      <button type="button" disabled={busy !== null} onClick={clear} className={`${button} border-white/30 bg-transparent text-white hover:border-white`}>
        <X className="size-3.5" /> გასუფთავება
      </button>
      {message ? <span className="text-xs font-bold text-[#ffd9a8]">{message}</span> : null}
    </div>
  );
}
