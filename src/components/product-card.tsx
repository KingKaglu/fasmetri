import Link from "next/link";
import { ArrowUpRight, Scale, Store } from "lucide-react";
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

export function ProductCard({
  product,
  deal = false,
  imagePriority = false,
}: {
  product: ProductView;
  deal?: boolean;
  imagePriority?: boolean;
}) {
  const offer = product.offers[0];
  if (!offer) return null;

  const discount = Math.max(...product.offers.map((item) => item.discountPercent), 0);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;
  const savings = offer.oldPrice && offer.oldPrice > offer.currentPrice ? offer.oldPrice - offer.currentPrice : 0;

  return (
    <article
      data-kind={deal ? "deal" : "product"}
      className="group flex min-w-0 flex-col overflow-hidden rounded-md border border-[#e2e8f0] bg-white transition hover:border-[#0f172a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-[#f1f5f9]">
        <ProductImage src={image} alt={product.name} priority={imagePriority} />
        {discount > 0 && (
          <span className="absolute left-1.5 top-1.5">
            <DiscountBadge percent={discount} />
          </span>
        )}
        <span className="absolute right-1.5 top-1.5">
          <AvailabilityBadge availability={offer.availability} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        {/* Name */}
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-[2.2rem] text-[12px] font-bold leading-[1.3] text-[#0f172a] hover:text-[#65a30d] sm:text-[13px]"
        >
          {product.name}
        </Link>

        {/* Price */}
        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} deal={deal && discount > 0} />

        {/* Savings */}
        {deal && savings > 0 && (
          <span className="inline-flex w-fit items-center rounded-sm bg-[#ecfdf5] px-1.5 py-0.5 text-[10px] font-black text-[#15803d]">
            დაზოგე {formatGel(savings)}
          </span>
        )}

        {/* Shop + meta */}
        <div className="mt-auto flex items-center gap-1.5 pt-1.5 text-[10px] font-bold text-[#64748b]">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="min-w-0 flex-1 truncate text-[#0f172a]">{offer.shop.name}</span>
          {shopCount > 1 && (
            <span className="shrink-0 rounded-sm bg-[#f1f5f9] px-1 py-0.5 text-[9px] font-black text-[#0f172a]">
              +{shopCount - 1}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
          <Store className="size-3 shrink-0" />
          <span className="truncate">
            {shopCount > 1 ? `${shopCount} მაღაზია` : `${product.offerCount ?? product.offers.length} შეთავაზება`}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="ml-auto text-[10px] shrink-0" />
        </div>

        {/* Actions */}
        <div className="mt-1 grid grid-cols-[1fr_2rem] gap-1">
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md bg-[#0f172a] px-2 text-[11px] font-bold text-white hover:bg-black"
          >
            <Scale className="size-3 shrink-0" />
            <span className="truncate">შეადარე</span>
          </Link>
          <a
            href={`/api/out/${offer.id}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${offer.shop.name} მაღაზიაში ნახვა`}
            title="მაღაზიაში ნახვა"
            className="grid size-8 place-items-center rounded-md border border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#84cc16] hover:bg-[#ecfccb]"
          >
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
