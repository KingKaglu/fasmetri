import Link from "next/link";
import { ArrowUpRight, Scale, Store, TrendingDown } from "lucide-react";
import { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { ShopClickLink } from "@/components/shop-click-link";
import {
  AvailabilityBadge,
  DiscountBadge,
  LastUpdatedText,
  PriceDisplay,
  ProductImage,
  ShopMark,
  realDiscountPercent,
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

  const discount = realDiscountPercent(offer);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;
  const savings = offer.oldPrice && offer.oldPrice > offer.currentPrice ? offer.oldPrice - offer.currentPrice : 0;
  const comparisonLabel = shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : "1 მაღაზიის შეთავაზება";

  return (
    <article
      data-kind={deal ? "deal" : "product"}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)]"
    >
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-[var(--line)]">
        <ProductImage src={image} alt={product.name} priority={imagePriority} />
        {discount > 0 && (
          <span className="absolute left-2 top-2">
            <DiscountBadge percent={discount} />
          </span>
        )}
        {offer.availability !== "UNKNOWN" ? (
          <span className="absolute right-2 top-2">
            <AvailabilityBadge availability={offer.availability} hideUnknown />
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="min-w-0 flex-1 truncate text-[11px] font-black text-[var(--brand)]">{offer.shop.name}</span>
          {shopCount > 1 && (
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-black text-[var(--brand)]">
              +{shopCount - 1}
            </span>
          )}
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-[2.25rem] text-[12px] font-black leading-[1.35] text-[var(--brand)] hover:text-[var(--accent-strong)] sm:text-[13px]"
        >
          {product.name}
        </Link>

        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} deal={deal && discount > 0} />

        {deal && savings > 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--savings-soft)] px-2 py-1 text-[10px] font-black text-[var(--savings)]">
            <TrendingDown className="size-3" />
            დაზოგე {formatGel(savings)}
          </span>
        )}

        <div className="mt-auto grid gap-1.5 border-t border-[var(--line)] pt-2.5 text-[10px] font-bold text-[var(--muted)]">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Store className="size-3 shrink-0" />
            <span className="truncate">{comparisonLabel}</span>
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="text-[10px]" />
        </div>

        <div className="grid gap-1.5">
          <Link
            href={`/products/${product.slug}`}
            className="btn-primary inline-flex h-10 min-w-0 items-center justify-center gap-1.5 px-3 text-[11px]"
          >
            <Scale className="size-3 shrink-0" />
            <span className="truncate">ფასების შედარება</span>
          </Link>
          <ShopClickLink
            offerId={offer.id}
            productId={product.id}
            productName={product.name}
            category={product.category?.slug}
            shopName={offer.shop.name}
            price={offer.currentPrice}
            sourceUrl={offer.url}
            ariaLabel={`${offer.shop.name} შეთავაზების ნახვა`}
            title="შეთავაზების ნახვა"
            className="btn-outline inline-flex h-10 min-w-0 items-center justify-center gap-1.5 px-3 text-[11px]"
          >
            <ArrowUpRight className="size-3.5" />
            <span className="truncate">შეთავაზების ნახვა</span>
          </ShopClickLink>
        </div>
      </div>
    </article>
  );
}
