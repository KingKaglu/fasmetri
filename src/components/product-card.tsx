import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
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
      className="card-hover group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-card)]"
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
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden bg-surface-soft">
        <ProductImage src={image} alt={product.name} priority={imagePriority} categorySlug={product.category?.slug} shopName={offer.shop.name} />
        {discount > 0 && (
          <span className="absolute left-2 top-2">
            <DiscountBadge percent={discount} />
          </span>
        )}
        {offer.availability !== "UNKNOWN" ? (
          <span className="absolute bottom-2 left-2">
            <AvailabilityBadge availability={offer.availability} hideUnknown />
          </span>
        ) : null}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* Shop row */}
        <div className="mb-2 flex min-w-0 items-center gap-1.5">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-muted">{offer.shop.name}</span>
          {shopCount > 1 && (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold tabular-nums text-accent">
              +{shopCount - 1}
            </span>
          )}
        </div>

        {/* Name — store titles carry the distinguishing bits (storage, RAM,
            colour) at the END, so clamping at two lines hid exactly what tells
            near-identical listings apart. Three lines fits essentially every
            real title; the price block below is bottom-anchored so prices stay
            aligned across a row no matter how tall the name runs. */}
        <Link
          href={`/products/${product.slug}`}
          title={product.name}
          className="mb-2.5 line-clamp-3 min-h-[4.2em] text-[13px] font-semibold leading-[1.4] text-ink hover:text-accent"
        >
          {product.name}
        </Link>

        {/* Normalized specs — classified-ad spec line, not chips. Always
            rendered (fixed height, empty when there are no specs) so every card
            in a grid row has the same height. */}
        <p className="mb-2 h-4 truncate text-[12px] font-medium leading-4 text-muted">
          {specChips.join(" · ")}
        </p>

        {/* Price */}
        <div className="mb-2 mt-auto">
          <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} deal={deal && discount > 0} />
        </div>

        {/* Savings badge */}
        {deal && savings > 0 ? (
          <span
            className="mb-2 inline-flex h-6 w-fit items-center gap-1 rounded-full border border-savings-strong/20 bg-savings-soft px-2 text-[11px] font-semibold text-savings-strong"
            title="რეალური ფასდაკლება — ძველი ფასი დადასტურებულია"
          >
            <BadgeCheck className="size-3" />
            ნამდვილი −{formatGel(savings)}
          </span>
        ) : deal ? (
          // Same height as the badge, so deal cards without one still line up.
          <span aria-hidden className="mb-2 block h-6" />
        ) : null}

        {/* Shop comparison info: store count + freshness, always visible */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-line pt-2">
          <span className={`text-[12px] font-semibold ${shopCount > 1 ? "text-savings-strong" : "text-muted"}`}>
            {shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : "ერთ მაღაზიაშია"}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="text-[12px] text-muted" />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href={`/products/${product.slug}`}
            className="flex h-9 items-center justify-center rounded-md bg-accent px-2 text-[11px] font-semibold text-white hover:bg-accent-strong"
          >
            {/* Not "შედარება": that is the compare tray's action. This opens the
                product page with every shop's price. Two-column phone cards
                leave ~55px for the label, so the short form is used there. */}
            <span className="sm:hidden">ფასები</span>
            <span className="hidden sm:inline">ყველა ფასი</span>
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
            className="flex h-9 items-center justify-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
          >
            ნახვა
            <ArrowUpRight className="size-3.5 shrink-0" />
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
