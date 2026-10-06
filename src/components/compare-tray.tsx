"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, X } from "lucide-react";
import { useCompare } from "@/lib/use-compare";

// Global fixed bottom bar. Mounted in the root layout but renders nothing until
// the provider has hydrated from localStorage AND at least one product is
// picked — so empty selections cost no layout and there is no SSR mismatch.
export function CompareTray() {
  const { mounted, items, remove, clear } = useCompare();
  const pathname = usePathname();
  const router = useRouter();

  // The compare page renders from `?items=`, not from this selection. Clearing
  // the tray while standing on it used to empty the tray and leave the table
  // fully rendered, so "clear" looked like it had done nothing — drop the query
  // string as well. Elsewhere the URL carries no selection, so there is nothing
  // to reset and we leave navigation alone.
  function handleClear() {
    clear();
    if (pathname === "/compare") router.replace("/compare");
  }

  // Removing the last chip has the same problem: the tray unmounts and the
  // stale table stays behind.
  function handleRemove(slug: string) {
    remove(slug);
    if (pathname === "/compare") {
      const remaining = items.filter((item) => item !== slug);
      router.replace(remaining.length ? `/compare?items=${remaining.map(encodeURIComponent).join(",")}` : "/compare");
    }
  }

  if (!mounted || items.length === 0) return null;

  const canCompare = items.length >= 2;
  const href = `/compare?items=${items.map(encodeURIComponent).join(",")}`;

  return (
    // Positioned by <BottomStack> (fixed, above the mobile nav and the cookie bar).
    <div className="w-full px-3 pb-2 md:px-0 md:pb-0">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-xs font-semibold text-muted">
            შედარება ({items.length}/4)
          </span>
          <ul className="flex min-w-0 items-center gap-1.5">
            {items.map((slug) => (
              <li key={slug}>
                <span className="flex max-w-[11rem] items-center gap-1 rounded-full border border-line bg-surface-soft py-1 pl-2.5 pr-1 text-[11px] font-medium text-ink-soft">
                  <span className="truncate" title={readableSlug(slug)}>{readableSlug(slug)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(slug)}
                    aria-label={`${readableSlug(slug)} — შედარებიდან მოხსნა`}
                    className="grid size-4 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-strong hover:text-ink-soft"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md px-2.5 py-2 text-xs font-semibold text-muted hover:bg-surface-mute hover:text-ink-soft"
          >
            გასუფთავება
          </button>
          {canCompare ? (
            <Link
              href={href}
              className="btn-accent flex h-9 items-center gap-1.5 px-4 text-xs"
            >
              <BarChart2 className="size-4" />
              შედარება ({items.length})
            </Link>
          ) : (
            <span
              aria-disabled
              className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md bg-surface-strong px-4 text-xs font-semibold text-muted"
              title="აირჩიე მინიმუმ 2 პროდუქტი"
            >
              <BarChart2 className="size-4" />
              შედარება ({items.length})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Slugs are the only thing in the selection state. Render a readable label from
// the slug (hyphens → spaces) since the tray has no product data to draw from.
function readableSlug(slug: string) {
  return slug.replace(/-[a-z0-9]{4,}$/i, "").replace(/[-_]+/g, " ").trim() || slug;
}
