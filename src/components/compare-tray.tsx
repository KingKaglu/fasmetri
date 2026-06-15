"use client";

import Link from "next/link";
import { BarChart2, X } from "lucide-react";
import { useCompare } from "@/lib/use-compare";

// Global fixed bottom bar. Mounted in the root layout but renders nothing until
// the provider has hydrated from localStorage AND at least one product is
// picked — so empty selections cost no layout and there is no SSR mismatch.
export function CompareTray() {
  const { mounted, items, remove, clear } = useCompare();

  if (!mounted || items.length === 0) return null;

  const canCompare = items.length >= 2;
  const href = `/compare?items=${items.map(encodeURIComponent).join(",")}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-xs font-semibold text-gray-500">
            შედარება ({items.length}/4)
          </span>
          <ul className="flex min-w-0 items-center gap-1.5">
            {items.map((slug) => (
              <li key={slug}>
                <span className="flex max-w-[11rem] items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1 text-[11px] font-medium text-gray-700">
                  <span className="truncate" title={readableSlug(slug)}>{readableSlug(slug)}</span>
                  <button
                    type="button"
                    onClick={() => remove(slug)}
                    aria-label={`${readableSlug(slug)} — შედარებიდან მოხსნა`}
                    className="grid size-4 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
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
            onClick={clear}
            className="rounded-md px-2.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            გასუფთავება
          </button>
          {canCompare ? (
            <Link
              href={href}
              className="flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              <BarChart2 className="size-4" />
              შედარება ({items.length})
            </Link>
          ) : (
            <span
              aria-disabled
              className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md bg-gray-200 px-4 text-xs font-semibold text-gray-400"
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
