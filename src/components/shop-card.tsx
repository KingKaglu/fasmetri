import Link from "next/link";
import { ArrowRight, BadgePercent, PackageSearch } from "lucide-react";
import { ShopView } from "@/lib/catalog-types";
import { LastUpdatedText, ShopMark, ShopStatusBadge } from "@/components/public-ui";

export function ShopCard({ shop }: { shop: ShopView }) {
  return (
    <article className="grid min-h-64 min-w-0 gap-4 rounded-[1.35rem] border border-[#d9e4f2] bg-white p-5 shadow-[0_14px_38px_rgba(18,32,58,.07)]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ShopMark shop={shop} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black">{shop.name}</h2>
            <p className="truncate text-sm font-semibold text-[#64748b]">{shop.baseUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <ShopStatusBadge shop={shop} />
      </div>
      <div className="grid gap-2 text-sm font-bold min-[360px]:grid-cols-2">
        <span className="rounded-2xl bg-[#eef5ff] p-3 text-[#12203a]"><PackageSearch className="mb-2 size-4 text-[#0054d2]" /> {shop.productCount ?? 0} პროდუქტი</span>
        <span className="rounded-2xl bg-[#fff1e8] p-3 text-[#c2410c]"><BadgePercent className="mb-2 size-4" /> {shop.dealCount ?? 0} აქცია</span>
      </div>
      <div className="mt-auto border-t border-[#e6edf7] pt-4">
        {shop.lastScrapedAt ? <LastUpdatedText value={shop.lastScrapedAt} className="text-sm font-bold" /> : <p className="text-sm font-bold text-[#64748b]">მონაცემები მოწმდება</p>}
        <Link href={`/shops/${shop.slug}`} className="mt-4 inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#0054d2] px-4 py-2 text-center font-black text-white hover:bg-[#003f9f]">
          შეთავაზებების ნახვა
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
