import Link from "next/link";
import { ArrowRight, BadgePercent, PackageSearch } from "lucide-react";
import { ShopView } from "@/lib/catalog-types";
import { LastUpdatedText, ShopMark, ShopStatusBadge } from "@/components/public-ui";

export function ShopCard({ shop }: { shop: ShopView }) {
  return (
    <article className="grid min-h-56 min-w-0 gap-3 rounded-md border border-[#e2e8f0] bg-white p-4 transition hover:border-[#0f172a]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ShopMark shop={shop} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-[#0f172a]">{shop.name}</h2>
            <p className="truncate text-xs font-semibold text-[#64748b]">{shop.baseUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <ShopStatusBadge shop={shop} />
      </div>

      <div className="grid gap-2 text-xs font-bold sm:grid-cols-2">
        <span className="inline-flex items-center gap-2 rounded-sm border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-2 text-[#0f172a]">
          <PackageSearch className="size-3.5 text-[#64748b]" />
          {(shop.productCount ?? 0).toLocaleString()} პროდუქტი
        </span>
        <span className="inline-flex items-center gap-2 rounded-sm border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-2 text-[#c2410c]">
          <BadgePercent className="size-3.5" />
          {(shop.dealCount ?? 0).toLocaleString()} აქცია
        </span>
      </div>

      <div className="mt-auto border-t border-[#e2e8f0] pt-3">
        {shop.lastScrapedAt ? (
          <LastUpdatedText value={shop.lastScrapedAt} className="text-xs font-bold" />
        ) : (
          <p className="text-xs font-bold text-[#64748b]">მონაცემები მოწმდება</p>
        )}
        <Link
          href={`/shops/${shop.slug}`}
          className="mt-3 inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-md bg-[#0f172a] px-4 text-sm font-bold text-white hover:bg-black"
        >
          ნახე შეთავაზებები
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
