import Link from "next/link";
import { ArrowRight, BadgePercent, PackageSearch } from "lucide-react";
import { ShopView } from "@/lib/catalog-types";
import { LastUpdatedText, ShopMark, ShopStatusBadge } from "@/components/public-ui";

export function ShopCard({ shop }: { shop: ShopView }) {
  return (
    <article className="flex min-h-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      {/* Shop identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ShopMark shop={shop} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900">{shop.name}</h2>
            <p className="truncate text-xs text-gray-400">{shop.baseUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <ShopStatusBadge shop={shop} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-600">
          <PackageSearch className="size-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{(shop.productCount ?? 0).toLocaleString()} პროდუქტი</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-700">
          <BadgePercent className="size-3.5 shrink-0" />
          <span className="truncate">{(shop.dealCount ?? 0).toLocaleString()} აქცია</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-gray-100 pt-3">
        {shop.lastScrapedAt ? (
          <LastUpdatedText value={shop.lastScrapedAt} className="mb-2.5 text-xs text-gray-400" />
        ) : (
          <p className="mb-2.5 text-xs text-gray-400">მონაცემები მოწმდება</p>
        )}
        <Link
          href={`/shops/${shop.slug}`}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          შეთავაზებების ნახვა
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
