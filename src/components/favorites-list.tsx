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
      <div className="grid min-h-60 place-items-center border border-gray-200 bg-white px-5 py-12 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-12 place-items-center border border-gray-200 bg-gray-50 text-gray-400">
            <Heart className="size-5" />
          </span>
          <h2 className="font-display mt-4 text-base font-bold text-gray-900">ფავორიტები ცარიელია</h2>
          <p className="mt-1.5 text-sm leading-6 text-gray-500">
            პროდუქტის ბარათზე გულის ღილაკით შეინახე პროდუქტები და აქ ერთ სიაში ნახავ.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex h-9 items-center bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-black"
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
        <p className="text-sm text-gray-500">
          <span className="font-bold tabular-nums text-gray-900">{count}</span> შენახული პროდუქტი
        </p>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-zinc-950 hover:text-zinc-950"
        >
          <Trash2 className="size-3.5" />
          სიის გასუფთავება
        </button>
      </div>

      <div className="product-grid-catalog grid">
        {items.map((item) => (
          <article key={item.slug} className="card-hover relative flex min-w-0 flex-col overflow-hidden border border-gray-200 bg-white">
            <button
              type="button"
              aria-label={`${item.name} — ფავორიტებიდან წაშლა`}
              title="წაშლა"
              onClick={() => remove(item.slug)}
              className="absolute right-2 top-2 z-20 grid size-7 place-items-center rounded-full border border-gray-200 bg-white/90 text-gray-500 backdrop-blur transition-colors hover:border-zinc-950 hover:text-zinc-950"
            >
              <Trash2 className="size-3.5" />
            </button>
            <Link href={`/products/${item.slug}`} className="relative block overflow-hidden">
              <ProductImage src={item.imageUrl} alt={item.name} categorySlug={item.categorySlug} shopName={item.shopName} />
            </Link>
            <div className="flex flex-1 flex-col p-3">
              <Link
                href={`/products/${item.slug}`}
                className="mb-2 line-clamp-2 min-h-[2.5rem] text-[12px] font-semibold leading-[1.4] text-gray-900 hover:text-[var(--accent)] sm:text-[13px]"
              >
                {item.name}
              </Link>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-1.5">
                <strong className="price-now text-base font-bold leading-none sm:text-lg">{formatGel(item.price)}</strong>
                {item.oldPrice && item.oldPrice > item.price ? (
                  <span className="price-old text-xs">{formatGel(item.oldPrice)}</span>
                ) : null}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  {item.shopCount && item.shopCount > 1 ? `${item.shopCount} მაღაზია` : item.shopName ?? ""}
                </span>
                <Link
                  href={`/products/${item.slug}`}
                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.05em] text-zinc-950 hover:underline"
                >
                  ნახვა
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-6 border-l-2 border-gray-300 pl-3 text-[11px] leading-5 text-gray-500">
        ფასები შენახვის მომენტისაა — გახსენი პროდუქტი მიმდინარე ფასის სანახავად. სია ინახება მხოლოდ ამ ბრაუზერში.
      </p>
    </div>
  );
}
