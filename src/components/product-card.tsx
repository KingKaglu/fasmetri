import Link from "next/link";
import { ArrowUpRight, Scale, Store, TrendingDown } from "lucide-react";
import { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
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
  const savings = offer.oldPrice && offer.oldPrice > offer.currentPrice ? offer.oldPrice - offer.currentPrice : 0;

  return (
    <article data-kind={deal ? "deal" : "product"} className="group flex min-w-0 flex-col overflow-hidden rounded-[1.1rem] border border-[#e2ecf8] bg-white shadow-[0_2px_10px_rgba(18,32,58,.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#b0caea] hover:shadow-[0_14px_40px_rgba(0,84,210,.13)]">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden">
        <ProductImage src={image} alt={product.name} priority={imagePriority} />
        {/* Shop badge */}
        <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-3.5rem)] items-center gap-1 rounded-lg border border-[#dde8f5] bg-white/96 px-1.5 py-0.5 text-[10px] font-black text-[#12203a] shadow-sm backdrop-blur-sm">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="truncate">{offer.shop.name}</span>
        </span>
        {discount > 0 && (
          <span className="absolute right-2 top-2"><DiscountBadge percent={discount} /></span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/* Category + availability */}
        <div className="flex min-h-5 items-center justify-between gap-1">
          <span className="truncate text-[10px] font-black uppercase tracking-wide text-[#0054d2]">{product.category?.nameKa ?? "პროდუქტი"}</span>
          <AvailabilityBadge availability={offer.availability} />
        </div>

        {/* Name */}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[2.3rem] break-words text-[12px] font-black leading-[1.35] text-[#12203a] hover:text-[#0054d2] sm:text-[13px]">
          {product.name}
        </Link>

        {/* Price */}
        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} />

        {/* Savings (deals only) */}
        {deal && savings > 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-[#eaf8ef] px-1.5 py-0.5 text-[10px] font-black text-[#15803d] ring-1 ring-[#bbefcc]">
            <TrendingDown className="size-3 shrink-0" />
            დაზოგე {formatGel(savings)}
          </span>
        )}

        {/* Meta row */}
        <div className="mt-auto flex min-w-0 items-center gap-1.5 border-t border-[#edf3f8] pt-2 text-[10px] font-bold text-[#8097b1]">
          <Store className="size-3 shrink-0 text-[#0054d2]" />
          <span className="min-w-0 truncate">
            {shopCount > 1
              ? <span className="font-black text-[#0054d2]">{shopCount} მაღაზია</span>
              : `${product.offerCount ?? product.offers.length} შეთავაზება`}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="ml-auto text-[10px] font-bold leading-4 shrink-0" />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-[1fr_2.25rem] gap-1.5">
          <Link href={`/products/${product.slug}`} className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[#0054d2] px-2 text-[11px] font-black text-white shadow-[0_4px_12px_rgba(0,84,210,.22)] transition hover:bg-[#003f9f] sm:text-xs">
            <Scale className="size-3 shrink-0" />
            <span className="truncate">შედარება</span>
          </Link>
          <a href={`/api/out/${offer.id}`} target="_blank" rel="noreferrer" aria-label={`${offer.shop.name} მაღაზიაში ნახვა`} title="მაღაზიაში ნახვა" className="grid size-8 place-items-center rounded-xl border border-[#d9e4f2] bg-white text-[#0054d2] transition hover:border-[#0054d2] hover:bg-[#eef5ff]">
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
