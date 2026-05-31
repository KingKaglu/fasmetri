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
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_10px_26px_rgba(18,19,15,0.07)] ring-1 ring-black/[0.03] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(18,19,15,0.14)]"
    >
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-[var(--line)]">
        <ProductImage src={image} alt={product.name} priority={imagePriority} />
        {discount > 0 && (
          <span className="absolute left-2 top-2">
            <DiscountBadge percent={discount} />
          </span>
        )}
        <span className="absolute right-2 top-2">
          <AvailabilityBadge availability={offer.availability} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
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

        <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-bold text-[var(--muted)]">
          <Store className="size-3 shrink-0" />
          <span className="truncate">
            {shopCount > 1 ? `${shopCount} მაღაზია` : `${product.offerCount ?? product.offers.length} შეთავაზება`}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="basis-full text-[10px] sm:ml-auto sm:basis-auto sm:shrink-0" />
        </div>

        <div className="grid grid-cols-[1fr_2.25rem] gap-1.5">
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-xl bg-[var(--brand)] px-2 text-[11px] font-black text-white hover:bg-black"
          >
            <Scale className="size-3 shrink-0" />
            <span className="truncate">შედარება</span>
          </Link>
          <ShopClickLink
            offerId={offer.id}
            productId={product.id}
            productName={product.name}
            category={product.category?.slug}
            shopName={offer.shop.name}
            price={offer.currentPrice}
            sourceUrl={offer.url}
            ariaLabel={`${offer.shop.name} მაღაზიაში ნახვა`}
            title="მაღაზიაში ნახვა"
            className="grid size-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-[var(--brand)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <ArrowUpRight className="size-3.5" />
          </ShopClickLink>
        </div>
      </div>
    </article>
  );
}
