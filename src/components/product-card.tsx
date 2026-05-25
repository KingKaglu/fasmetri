import Link from "next/link";
import { ArrowUpRight, Scale, Store } from "lucide-react";
import { ProductView } from "@/lib/catalog-types";
import {
  AvailabilityBadge,
  DiscountBadge,
  LastUpdatedText,
  PriceDisplay,
  ProductImage,
  ShopMark,
} from "@/components/public-ui";

export function ProductCard({ product, deal = false, imagePriority = false }: { product: ProductView; deal?: boolean; imagePriority?: boolean }) {
  const offer = product.offers[0];
  if (!offer) return null;

  const discount = Math.max(...product.offers.map((item) => item.discountPercent), 0);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;

  return (
    <article data-kind={deal ? "deal" : "product"} className="group flex min-w-0 flex-col overflow-hidden rounded-[1.05rem] border border-[#d9e4f2] bg-white shadow-[0_5px_18px_rgba(18,32,58,.055)] transition hover:-translate-y-0.5 hover:border-[#b8cdf0] hover:shadow-[0_16px_38px_rgba(0,84,210,.12)]">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-[#e6edf7]">
        <ProductImage src={image} alt={product.name} priority={imagePriority} />
        <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-4.25rem)] items-center gap-1.5 rounded-xl border border-[#d9e4f2] bg-white/95 px-1.5 py-1 pr-2 text-[11px] font-black text-[#12203a] shadow-sm backdrop-blur">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="truncate">{offer.shop.name}</span>
        </span>
        <span className="absolute right-2 top-2"><DiscountBadge percent={discount} /></span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex min-h-6 items-center justify-between gap-1.5">
          <span className="truncate text-[11px] font-black text-[#0054d2]">{product.category?.nameKa ?? "პროდუქტი"}</span>
          <AvailabilityBadge availability={offer.availability} />
        </div>

        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[2.4rem] break-words text-[13px] font-black leading-[1.3] text-[#12203a] hover:text-[#0054d2] sm:text-sm">
          {product.name}
        </Link>

        <div className="pt-0.5">
          <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} />
        </div>

        <div className="mt-auto grid gap-0.5 border-t border-[#e6edf7] pt-2 text-[11px] font-bold">
          <span className="flex min-w-0 items-center gap-1.5 text-[#64748b]">
            <Store className="size-3 shrink-0 text-[#0054d2]" />
            <span className="truncate">{shopCount > 1 ? `${shopCount} მაღაზია` : `${product.offerCount ?? product.offers.length} შეთავაზება`}</span>
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="text-[11px] font-bold leading-4" />
        </div>

        <div className="grid grid-cols-[1fr_2.5rem] gap-1.5">
          <Link href={`/products/${product.slug}`} className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[#0054d2] px-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(0,84,210,.16)] hover:bg-[#003f9f] sm:text-sm">
            <Scale className="size-3.5 shrink-0" />
            <span><span className="hidden sm:inline">ფასების </span>შედარება</span>
          </Link>
          <a href={`/api/out/${offer.id}`} target="_blank" rel="noreferrer" aria-label={`${offer.shop.name} მაღაზიაში ნახვა`} title="მაღაზიაში ნახვა" className="grid size-9 place-items-center rounded-xl border border-[#d9e4f2] bg-white text-[#0054d2] hover:border-[#0054d2] hover:bg-[#eef5ff]">
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
