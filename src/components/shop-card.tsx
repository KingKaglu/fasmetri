import Link from "next/link";
import { ArrowRight, BadgePercent, PackageSearch } from "lucide-react";
import { ShopView } from "@/lib/catalog-types";
import { LastUpdatedText, ShopMark, ShopStatusBadge } from "@/components/public-ui";
import { formatNumber } from "@/lib/format";

export function ShopCard({ shop }: { shop: ShopView }) {
  return (
    <article className="card-hover flex min-h-0 flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
      {/* Shop identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ShopMark shop={shop} />
          <div className="min-w-0">
            <h2 className="font-display truncate text-[15px] font-bold text-ink">{shop.name}</h2>
            <p className="truncate text-xs text-muted">{shop.baseUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <ShopStatusBadge shop={shop} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface-soft px-2.5 py-2 text-xs font-medium text-ink-soft">
          <PackageSearch className="size-3.5 shrink-0 text-muted" />
          <span className="truncate">{formatNumber(shop.productCount ?? 0)} პროდუქტი</span>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-semibold ${
            (shop.dealCount ?? 0) > 0
              ? "border-deal-strong/15 bg-deal-soft text-danger-strong"
              : "border-line bg-surface-soft text-muted"
          }`}
        >
          <BadgePercent className="size-3.5 shrink-0" />
          <span className="truncate">{formatNumber(shop.dealCount ?? 0)} აქცია</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-line pt-3">
        {shop.lastScrapedAt ? (
          <LastUpdatedText value={shop.lastScrapedAt} warnStale className="mb-2.5 text-xs" />
        ) : (
          <p className="mb-2.5 text-xs text-muted">მონაცემები მოწმდება</p>
        )}
        <Link
          href={`/shops/${shop.slug}`}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-xs font-semibold text-accent-ink hover:bg-accent-strong"
        >
          შეთავაზებების ნახვა
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
