"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useCompare } from "@/lib/use-compare";

/**
 * Keeps the compare page and the saved selection (the tray) agreeing with each
 * other. Two failure modes it exists to fix:
 *
 * 1. STALE SLUGS. The page renders from `?items=`, but the tray persists slugs
 *    in localStorage indefinitely. A product that stops being public — sold
 *    out, delisted, re-matched by a sync — silently vanishes from the table,
 *    so the page could show "nothing selected" while the tray still insisted
 *    you had items picked. Worse, the dead slugs kept occupying the 4-slot cap,
 *    which disabled the "+" button on every card site-wide. We drop them from
 *    the selection and say so.
 *
 * 2. NO `?items=` IN THE URL. Arriving at a bare /compare — via back/forward, a
 *    bookmark, or the link the remove button leaves behind — showed the empty
 *    state even with a full tray. We restore the saved selection into the URL.
 *
 * The URL stays the source of truth for rendering, so a compare view is still
 * server-rendered and shareable; this only repairs the URL when it disagrees
 * with what the user actually has selected.
 */
export function CompareSync({ requested, resolved }: { requested: string[]; resolved: string[] }) {
  const router = useRouter();
  const { mounted, items, removeMany } = useCompare();
  const [dropped, setDropped] = useState<string[]>([]);

  const requestedKey = requested.join(",");
  const resolvedKey = resolved.join(",");
  // Prune once per URL. Without this the effect would re-run on the state
  // change it just caused and re-announce the same dead slugs.
  const prunedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!mounted) return;

    const alive = new Set(resolvedKey ? resolvedKey.split(",") : []);
    const requestedList = requestedKey ? requestedKey.split(",") : [];
    const dead = requestedList.filter((slug) => !alive.has(slug));

    if (dead.length && prunedFor.current !== requestedKey) {
      prunedFor.current = requestedKey;
      setDropped(dead);
      removeMany(dead);
      return;
    }

    // Restore from the saved selection when the URL cannot render a comparison
    // but the tray can. Guarded on inequality so this never loops: each pass
    // either matches the URL already or replaces it with a strictly different,
    // known-good list.
    if (alive.size < 2 && items.length >= 2) {
      const target = items.join(",");
      if (target !== requestedKey) {
        router.replace(`/compare?items=${items.map(encodeURIComponent).join(",")}`);
      }
    }
  }, [mounted, items, requestedKey, resolvedKey, removeMany, router]);

  if (!dropped.length) return null;

  return (
    <p
      role="status"
      className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-5 text-amber-800"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>
        {dropped.length === 1
          ? "1 პროდუქტი შედარებიდან მოიხსნა — ის ამჟამად ხელმისაწვდომი აღარ არის."
          : `${dropped.length} პროდუქტი შედარებიდან მოიხსნა — ისინი ამჟამად ხელმისაწვდომი აღარ არის.`}
      </span>
    </p>
  );
}
