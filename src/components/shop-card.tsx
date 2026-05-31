import Link from "next/link";
import { ArrowRight, BadgePercent, PackageSearch } from "lucide-react";
import { ShopView } from "@/lib/catalog-types";
import { LastUpdatedText, ShopMark, ShopStatusBadge } from "@/components/public-ui";

export function ShopCard({ shop }: { shop: ShopView }) {
  return (
    <article className="grid min-h-56 min-w-0 gap-3 rounded-2xl border border-white/70 bg-white/88 p-4 shadow-[0_10px_26px_rgba(18,19,15,0.07)] ring-1 ring-black/[0.03] transition hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(18,19,15,0.13)]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ShopMark shop={shop} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-[var(--brand)]">{shop.name}</h2>
            <p className="truncate text-xs font-bold text-[var(--muted)]">{shop.baseUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <ShopStatusBadge shop={shop} />
      </div>

      <div className="grid gap-2 text-xs font-black sm:grid-cols-2">
        <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--brand)]">
          <PackageSearch className="size-3.5 text-[var(--muted)]" />
          {(shop.productCount ?? 0).toLocaleString()} პროდუქტი
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl border border-[#ffdca6] bg-[var(--warn-soft)] px-3 py-2 text-[var(--warn)]">
          <BadgePercent className="size-3.5" />
          {(shop.dealCount ?? 0).toLocaleString()} აქცია
        </span>
      </div>

      <div className="mt-auto border-t border-[var(--line)] pt-3">
        {shop.lastScrapedAt ? (
          <LastUpdatedText value={shop.lastScrapedAt} className="text-xs font-bold" />
        ) : (
          <p className="text-xs font-bold text-[var(--muted)]">მონაცემები მოწმდება</p>
        )}
        <Link
          href={`/shops/${shop.slug}`}
          className="mt-3 inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-sm font-black text-white hover:bg-black"
        >
          შეთავაზებების ნახვა
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
