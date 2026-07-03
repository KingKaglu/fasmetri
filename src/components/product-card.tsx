import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BarChart2 } from "lucide-react";
import { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { extractProductAttributes } from "@/lib/productNormalization";
import { ShopClickLink } from "@/components/shop-click-link";
import { CompareToggle } from "@/components/compare-toggle";
import { FavoriteToggle } from "@/components/favorite-toggle";
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
  const shopCount = new Set(product.offers.map((o) => o.shop.id)).size;
  const savings = offer.oldPrice && offer.oldPrice > offer.currentPrice ? offer.oldPrice - offer.currentPrice : 0;
  const specChips = normalizedSpecChips(product);

  return (
    <article
      data-kind={deal ? "deal" : "product"}
      className="card-hover group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[var(--shadow-card)]"
    >
      {/* Compare + favorite toggles — additive, sit above the image link, never navigate */}
      <CompareToggle slug={product.slug} name={product.name} />
      <FavoriteToggle
        snapshot={{
          slug: product.slug,
          name: product.name,
          price: offer.currentPrice,
          oldPrice: offer.oldPrice,
          imageUrl: image,
          shopName: offer.shop.name,
          shopCount,
          categorySlug: product.category?.slug,
        }}
      />

      {/* Image */}
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden bg-gray-50">
        <ProductImage src={image} alt={product.name} priority={imagePriority} categorySlug={product.category?.slug} shopName={offer.shop.name} />
        {discount > 0 && (
          <span className="absolute left-2 top-2">
            <DiscountBadge percent={discount} />
          </span>
        )}
        {offer.availability !== "UNKNOWN" ? (
          <span className="absolute right-2 top-11">
            <AvailabilityBadge availability={offer.availability} hideUnknown />
          </span>
        ) : null}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        {/* Shop row */}
        <div className="mb-2 flex min-w-0 items-center gap-1.5">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-gray-500">{offer.shop.name}</span>
          {shopCount > 1 && (
            <span className="shrink-0 border border-zinc-900 bg-white px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-900">
              +{shopCount - 1}
            </span>
          )}
        </div>

        {/* Name */}
        <Link
          href={`/products/${product.slug}`}
          className="mb-2.5 line-clamp-2 min-h-[2.5rem] text-[12px] font-semibold leading-[1.4] text-gray-900 hover:text-[var(--accent)] sm:text-[13px]"
        >
          {product.name}
        </Link>

        {/* Normalized specs — classified-ad spec line, not chips */}
        {specChips.length > 0 && (
          <p className="mb-2 truncate text-[10.5px] font-medium uppercase tracking-[0.05em] text-gray-500">
            {specChips.join(" · ")}
          </p>
        )}

        {/* Price */}
        <div className="mb-2">
          <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} deal={deal && discount > 0} />
        </div>

        {/* Savings badge */}
        {deal && savings > 0 && (
          <span
            className="mb-2 inline-flex w-fit items-center gap-1 rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-900"
            title="რეალური ფასდაკლება — ძველი ფასი დადასტურებულია"
          >
            <BadgeCheck className="size-3" />
            ნამდვილი −{formatGel(savings)}
          </span>
        )}

        {/* Shop comparison info: store count + freshness, always visible */}
        <div className="mb-3 mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-gray-100 pt-2">
          <span className={`text-[10px] font-bold uppercase tracking-[0.05em] ${shopCount > 1 ? "text-zinc-950" : "text-gray-400"}`}>
            {shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : "ერთ მაღაზიაშია"}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="text-[10px] text-gray-400" />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href={`/products/${product.slug}`}
            className="flex h-9 items-center justify-center gap-1 rounded-md border border-zinc-900 bg-zinc-950 px-2 text-[11px] font-semibold text-white hover:bg-black"
          >
            <BarChart2 className="size-3 shrink-0" />
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
            ariaLabel={`${offer.shop.name} შეთავაზება`}
            title="შეთავაზება"
            className="flex h-9 items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            <ArrowUpRight className="size-3.5 shrink-0" />
            <span className="truncate">ნახვა</span>
          </ShopClickLink>
        </div>
      </div>
    </article>
  );
}

// Up to three normalized spec chips (RAM, storage, screen/color) so visually
// similar listings are distinguishable at a glance in grids and search results.
function normalizedSpecChips(product: ProductView) {
  const attributes = extractProductAttributes({ title: product.name, categorySlug: product.category?.slug });
  return [
    attributes.ram[0] ? `RAM ${attributes.ram[0]}` : null,
    attributes.storage[0] ?? null,
    attributes.screenSize ?? attributes.color ?? null,
  ]
    .filter((chip): chip is string => Boolean(chip))
    .slice(0, 3);
}
