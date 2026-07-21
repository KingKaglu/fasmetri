"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, History } from "lucide-react";
import { formatGel } from "@/lib/format";
import { ProductImage } from "@/components/product-image";
import type { FavoriteSnapshot } from "@/lib/use-favorites";

// Recently-viewed products ("ბოლოს ნანახი") — the idealo-style recents rail.
// Product pages record a snapshot on mount (RecordRecentView); the strip reads
// once on mount, so it is hydration-safe (renders nothing on the server and on
// the first client paint).

const RECENTS_STORAGE_KEY = "fasmetri:recents";
const RECENTS_MAX = 12;

type RecentSnapshot = Omit<FavoriteSnapshot, "savedAt"> & { viewedAt: number };

function readRecents(): RecentSnapshot[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentSnapshot =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.slug === "string" &&
        typeof item.name === "string" &&
        typeof item.price === "number",
    );
  } catch {
    return [];
  }
}

export function RecordRecentView({ snapshot }: { snapshot: Omit<FavoriteSnapshot, "savedAt"> }) {
  useEffect(() => {
    try {
      const next: RecentSnapshot[] = [
        { ...snapshot, viewedAt: Date.now() },
        ...readRecents().filter((item) => item.slug !== snapshot.slug),
      ].slice(0, RECENTS_MAX);
      window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures — recents are best-effort.
    }
    // Record once per product page visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.slug]);

  return null;
}

export function RecentlyViewedStrip({ excludeSlug, inline = false }: { excludeSlug?: string; inline?: boolean }) {
  const [items, setItems] = useState<RecentSnapshot[]>([]);

  useEffect(() => {
    setItems(readRecents().filter((item) => item.slug !== excludeSlug));
  }, [excludeSlug]);

  if (!items.length) return null;

  const Wrapper = inline ? "div" : "section";

  return (
    <Wrapper className={inline ? "min-w-0" : "shell pt-8 pb-4"}>
      <div className="masthead mb-5">
        <div className="masthead-row">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="masthead-kicker inline-flex items-center gap-1.5">
              <History className="size-3" />
              ისტორია
            </p>
            <h2 className="masthead-title min-w-0 truncate">ბოლოს ნანახი</h2>
          </div>
          <Link href="/favorites" className="masthead-link inline-flex items-center gap-1">
            ფავორიტები
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
      <div className="-mx-1 flex min-w-0 snap-x gap-3 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/products/${item.slug}`}
            className="card-hover w-[160px] shrink-0 snap-start overflow-hidden border border-gray-200 bg-white"
          >
            <div className="border-b border-gray-100">
              <ProductImage src={item.imageUrl} alt={item.name} categorySlug={item.categorySlug} shopName={item.shopName} />
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 min-h-[2.1rem] text-[11px] font-semibold leading-snug text-gray-900">{item.name}</p>
              <p className="mt-1 text-sm font-bold tabular-nums text-gray-900">{formatGel(item.price)}</p>
              {item.shopName ? (
                <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.05em] text-gray-400">{item.shopName}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </Wrapper>
  );
}
