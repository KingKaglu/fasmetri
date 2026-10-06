"use client";

import Link from "next/link";
import { ArrowUpRight, Heart, Trash2 } from "lucide-react";
import { formatGel } from "@/lib/format";
import { ProductImage } from "@/components/product-image";
import { useFavorites } from "@/lib/use-favorites";

// Client body of /favorites — renders straight from the localStorage
// snapshots, so the page works with zero server queries (guest wishlist).
export function FavoritesList() {
  const { mounted, items, remove, clear, count } = useFavorites();

  // Until hydration finishes render a stable placeholder so server markup matches.
  if (!mounted) {
    return <div className="min-h-40" aria-hidden />;
  }

  if (!count) {
    return (
      <div className="grid min-h-60 place-items-center border border-line bg-surface px-5 py-12 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-12 place-items-center border border-line bg-surface-soft text-muted">
            <Heart className="size-5" />
          </span>
          <h2 className="font-display mt-4 text-base font-bold text-ink">ფავორიტები ცარიელია</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            პროდუქტის ბარათზე გულის ღილაკით შეინახე პროდუქტები და აქ ერთ სიაში ნახავ.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            კატალოგის ნახვა
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-bold tabular-nums text-ink">{count}</span> შენახული პროდუქტი
        </p>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-3.5" />
          სიის გასუფთავება
        </button>
      </div>

      <div className="product-grid-catalog grid">
        {items.map((item) => (
          <article key={item.slug} className="card-hover relative flex min-w-0 flex-col overflow-hidden border border-line bg-surface">
            <button
              type="button"
              aria-label={`${item.name} — ფავორიტებიდან წაშლა`}
              title="წაშლა"
              onClick={() => remove(item.slug)}
              className="absolute right-2 top-2 z-20 grid size-7 place-items-center rounded-full border border-line bg-white/90 text-muted backdrop-blur transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="size-3.5" />
            </button>
            <Link href={`/products/${item.slug}`} className="relative block overflow-hidden">
              <ProductImage src={item.imageUrl} alt={item.name} categorySlug={item.categorySlug} shopName={item.shopName} />
            </Link>
            <div className="flex flex-1 flex-col p-3">
              <Link
                href={`/products/${item.slug}`}
                title={item.name}
                className="mb-2 line-clamp-4 text-[12px] font-semibold leading-[1.4] text-ink hover:text-accent sm:line-clamp-3 sm:text-[13px]"
              >
                {item.name}
              </Link>
              <div className="mb-2 mt-auto flex flex-wrap items-baseline gap-x-1.5">
                <strong className="price-now text-base font-bold leading-none sm:text-lg">{formatGel(item.price)}</strong>
                {item.oldPrice && item.oldPrice > item.price ? (
                  <span className="price-old text-xs">{formatGel(item.oldPrice)}</span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
                <span className="truncate text-[12px] font-semibold text-muted">
                  {item.shopCount && item.shopCount > 1 ? `${item.shopCount} მაღაზია` : item.shopName ?? ""}
                </span>
                <Link
                  href={`/products/${item.slug}`}
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-accent hover:underline"
                >
                  ნახვა
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-6 border-l-2 border-line-strong pl-3 text-[12px] leading-5 text-muted">
        ფასები შენახვის მომენტისაა — გახსენი პროდუქტი მიმდინარე ფასის სანახავად. სია ინახება მხოლოდ ამ ბრაუზერში.
      </p>
    </div>
  );
}
