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
      aria-label={`áƒáƒ áƒ©áƒ”áƒ•áƒ: ${title}`}
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
        setMessage(result.detail ?? "áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
        clear();
        router.refresh();
      } else {
        setMessage(result.error ?? "áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
      }
    } catch {
      setMessage("áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ¡áƒ áƒ£áƒšáƒ“áƒ.");
    }
    setBusy(null);
  }

  const button =
    "inline-flex h-9 items-center gap-1.5 rounded-2xl border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-[#151713] bg-[#151713] p-3 text-white shadow-lg">
      <span className="text-xs font-black">{selected.length} áƒáƒ áƒ©áƒ”áƒ£áƒšáƒ˜</span>
      <button
        type="button"
        disabled={busy !== null}
        title="áƒ§áƒ•áƒ”áƒšáƒ áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ áƒ’áƒáƒ“áƒáƒ“áƒ˜áƒ¡ áƒ¡áƒáƒ™áƒ£áƒ—áƒáƒ  áƒªáƒáƒšáƒ™áƒ”áƒ£áƒš áƒžáƒ áƒáƒ“áƒ£áƒ¥áƒ¢áƒ¨áƒ˜ (áƒ¯áƒ’áƒ£áƒ¤áƒ˜áƒ¡ áƒ“áƒáƒ¨áƒšáƒ)"
        onClick={() => {
          if (!window.confirm(`áƒ“áƒáƒ˜áƒ¨áƒáƒšáƒáƒ¡ ${selected.length} áƒžáƒ áƒáƒ“áƒ£áƒ¥áƒ¢áƒ˜áƒ¡ áƒ§áƒ•áƒ”áƒšáƒ áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ áƒªáƒáƒšáƒ™áƒ”áƒ£áƒš áƒžáƒ áƒáƒ“áƒ£áƒ¥áƒ¢áƒ”áƒ‘áƒáƒ“?`)) return;
          run("unlink", () => bulkUnlinkProducts(selected.map((entry) => entry.id)));
        }}
        className={`${button} border-[#d4d4d8] bg-[#f4f4f5] text-[var(--danger)] hover:border-white`}
      >
        {busy === "unlink" ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
        Bulk unlink
      </button>
      <button
        type="button"
        disabled={busy !== null || orphanCount === 0}
        title="áƒ¬áƒáƒ˜áƒ¨áƒšáƒ”áƒ‘áƒ áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ˜áƒ¡ áƒáƒ áƒ©áƒ”áƒ£áƒšáƒ˜ áƒžáƒ áƒáƒ“áƒ£áƒ¥áƒ¢áƒ”áƒ‘áƒ˜, áƒ áƒáƒ›áƒšáƒ”áƒ‘áƒ¡áƒáƒª áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ áƒáƒ  áƒáƒ¥áƒ•áƒ—"
        onClick={() => {
          if (!window.confirm(`áƒ¬áƒáƒ˜áƒ¨áƒáƒšáƒáƒ¡ ${orphanCount} áƒáƒ‘áƒáƒšáƒ˜ (0 áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ) áƒžáƒ áƒáƒ“áƒ£áƒ¥áƒ¢áƒ˜?`)) return;
          run("delete", () => bulkDeleteOrphans(selected.map((entry) => entry.id)));
        }}
        className={`${button} border-[#d4d4d8] bg-[#f4f4f5] text-[var(--danger)] hover:border-white`}
      >
        {busy === "delete" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        áƒáƒ‘áƒšáƒ”áƒ‘áƒ˜áƒ¡ áƒ¬áƒáƒ¨áƒšáƒ ({orphanCount})
      </button>
      <button
        type="button"
        disabled={busy !== null || selected.length !== 2}
        title="áƒ–áƒ£áƒ¡áƒ¢áƒáƒ“ 2 áƒáƒ áƒ©áƒ”áƒ£áƒšáƒ˜: áƒžáƒ˜áƒ áƒ•áƒ”áƒšáƒ˜ áƒ áƒ©áƒ”áƒ‘áƒ, áƒ›áƒ”áƒáƒ áƒ˜áƒ¡ áƒ¨áƒ”áƒ—áƒáƒ•áƒáƒ–áƒ”áƒ‘áƒ”áƒ‘áƒ˜ áƒ’áƒáƒ“áƒáƒ“áƒ˜áƒ¡ áƒ›áƒáƒ¡áƒ¨áƒ˜"
        onClick={() => {
          const [target, source] = selected;
          if (!window.confirm(`áƒ’áƒáƒ”áƒ áƒ—áƒ˜áƒáƒœáƒ”áƒ‘áƒ:\n\n"${source.title}"\nâ†’ áƒ’áƒáƒ“áƒáƒ“áƒ˜áƒ¡ â†’\n"${target.title}"\n\n(áƒžáƒ˜áƒ áƒ•áƒ”áƒšáƒ˜ áƒáƒ áƒ©áƒ”áƒ£áƒšáƒ˜ áƒ áƒ©áƒ”áƒ‘áƒ, áƒ›áƒ”áƒáƒ áƒ” áƒ˜áƒ¨áƒšáƒ”áƒ‘áƒ)`)) return;
          run("merge", () => mergeCanonicalProducts(target.id, source.id));
        }}
        className={`${button} border-[#b8edf2] bg-[var(--aqua-soft)] text-[#087d8f] hover:border-white`}
      >
        {busy === "merge" ? <Loader2 className="size-3.5 animate-spin" /> : <GitMerge className="size-3.5" />}
        áƒ’áƒáƒ”áƒ áƒ—áƒ˜áƒáƒœáƒ”áƒ‘áƒ 2â†’1
      </button>
      <button type="button" disabled={busy !== null} onClick={clear} className={`${button} border-white/30 bg-transparent text-white hover:border-white`}>
        <X className="size-3.5" /> áƒ’áƒáƒ¡áƒ£áƒ¤áƒ—áƒáƒ•áƒ”áƒ‘áƒ
      </button>
      {message ? <span className="text-xs font-bold text-[#d4d4d8]">{message}</span> : null}
    </div>
  );
}
