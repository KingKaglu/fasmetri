import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { getPublicProduct, listPublicProductMatches } from "@/lib/catalog";
import { HistoryPoint, isPublicMatchStatus, ProductView } from "@/lib/catalog-types";
import { PriceChart } from "@/components/price-chart";
import { Sparkline } from "@/components/sparkline";
import { AlertForm } from "@/components/alert-form";
import { activeEmailProvider } from "@/server/alerts/email";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { ShareButton } from "@/components/share-button";
import { RecentlyViewedStrip, RecordRecentView } from "@/components/recently-viewed";
import { ProductGrid } from "@/components/product-grid";
import { ShopClickLink } from "@/components/shop-click-link";
import { TrackView } from "@/components/track-view";
import { JsonLd } from "@/components/json-ld";
import { buildProductJsonLd, buildProductBreadcrumbJsonLd } from "@/lib/structured-data";
import {
  AvailabilityBadge,
  DiscountBadge,
  LastUpdatedText,
  PriceDisclaimer,
  PriceDisplay,
  ProductImage,
  SectionHeader,
  ShopMark,
  ShopStatusBadge,
  TrustNote,
  EmptyState,
  realDiscountPercent,
} from "@/components/public-ui";
import { formatGel } from "@/lib/format";
import { extractProductAttributes, ProductAttributes } from "@/lib/productNormalization";
import { extractProductIdentity } from "@/lib/productIdentity";
import { explainMatchDecision } from "@/lib/productMatching";

// Product pages depend only on the slug (no searchParams) and the catalog
// refreshes daily — serve them via ISR so each product is cached at the edge
// after the first render instead of re-querying Supabase on every visit.
// Freshness comes from on-demand revalidation (every sync curls
// /api/revalidate), so the time-based window is only a backstop. At 600s a
// crawler walking ~3,000 product URLs re-rendered nearly every one of them,
// which is what burned the Hobby plan's Fluid CPU allowance.
export const revalidate = 3600;

// A dynamic segment only joins the ISR cache when it declares
// generateStaticParams; without it Next serves the route fully dynamic
// (`Cache-Control: private, no-store`) and `revalidate` above is ignored —
// every product view then woke a function and re-queried Postgres. The list is
// empty on purpose: there are >1200 products and prerendering them all would
// make each deploy scrape the whole catalogue. Pages are rendered on first
// request and cached at the edge for 10 minutes from then on.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

// No loading.tsx for this segment: a route-level skeleton makes Next stream
// the response, which flushes a 200 before notFound() can run — unknown
// slugs then answer 200 with a not-found body, which Search Console reads
// as a soft 404. Serving the real 404 is worth more than the skeleton.

const historyDayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tbilisi",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getPublicProduct((await params).slug);
  // Single source of truth for "this product does not exist": metadata and the
  // page below agree on one condition instead of each handling it separately.
  if (!product) notFound();

  const cheapest = product.offers[0];
  const description = cheapest
    ? `${product.name} — საუკეთესო ფასი ${formatGel(cheapest.currentPrice)}. შეადარე ფასები ქართულ ონლაინ მაღაზიებში.`
    : `${product.name} ფასები და შეთავაზებები ქართულ ონლაინ მაღაზიებში.`;

  return {
    title: `${product.name} ფასების შედარება`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    // og:image comes from the co-located opengraph-image.tsx (branded price card).
    openGraph: {
      title: `${product.name} ფასების შედარება — ფასმეტრი`,
      description,
    },
    other: cheapest
      ? {
          "product:price:amount": String(cheapest.currentPrice),
          "product:price:currency": "GEL",
        }
      : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getPublicProduct((await params).slug);
  if (!product || !product.offers[0]) notFound();

  // offers are ordered stock-first, then by price (compareOffersForDisplay), so
  // offers[0] is the cheapest offer you can actually buy — the one the hero,
  // the CTA and the "საუკეთესო ფასი" badge must point at.
  const cheapest = product.offers[0];
  const cheapestBuyable = cheapest.availability !== "OUT_OF_STOCK";
  const history = dailyLowestHistory(product.offers.flatMap((offer) => offer.history ?? []));
  const priceSummary = offerPriceSummary(product);
  const cheapestDiscount = realDiscountPercent(cheapest);
  const productIdentity = extractProductIdentity({
    title: product.name,
    brand: product.brand,
    model: product.model,
    categorySlug: product.category?.slug,
    imageUrl: product.imageUrl ?? cheapest.imageUrl,
  });
  const offerDetails = product.offers.map((offer) => ({
    offer,
    attributes: attributesWithIdentity(
      extractProductAttributes({ title: offer.title, categorySlug: product.category?.slug }),
      offer.productIdentity ?? product.productIdentity,
    ),
    match: explainMatchDecision(
      productIdentity,
      extractProductIdentity({ title: offer.title, categorySlug: product.category?.slug, imageUrl: offer.imageUrl }),
    ),
  }));
  const comparisonMessage =
    priceSummary.shopCount === 1
      ? "ამ დროისთვის ეს პროდუქტი მხოლოდ ერთ მაღაზიაშია ნაპოვნი."
      : "ფასები შედარებულია რამდენიმე მაღაზიიდან.";
  const categoryPool = product.category
    ? (await listPublicProductMatches({ category: product.category.slug })).filter((item) => item.id !== product.id)
    : [];
  const similarSections = buildSimilarSections(product, categoryPool);
  const productJsonLd = buildProductJsonLd(product);
  const breadcrumbJsonLd = buildProductBreadcrumbJsonLd(product);

  return (
    <section className="shell py-5 sm:py-8">
      <JsonLd data={productJsonLd ? [productJsonLd, breadcrumbJsonLd] : [breadcrumbJsonLd]} />
      <RecordRecentView
        snapshot={{
          slug: product.slug,
          name: product.name,
          price: cheapest.currentPrice,
          oldPrice: cheapest.oldPrice,
          imageUrl: product.imageUrl ?? cheapest.imageUrl,
          shopName: cheapest.shop.name,
          shopCount: priceSummary.shopCount,
          categorySlug: product.category?.slug,
        }}
      />
      <TrackView
        event="product_view"
        signature={`product_view:${product.id}`}
        params={{
          product_id: product.id,
          product_name: product.name,
          category: product.category?.slug,
          lowest_price: cheapest.currentPrice,
          shops_count: priceSummary.shopCount,
        }}
      />
      {/* Breadcrumb */}
      <nav aria-label="ნავიგაცია" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted">
        <Link href="/" className="hover:text-ink-soft">მთავარი</Link>
        <ChevronRight className="size-3" />
        {product.category ? (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-ink-soft">
              {product.category.nameKa}
            </Link>
            <ChevronRight className="size-3" />
          </>
        ) : null}
        <span className="truncate font-medium text-ink-soft">{product.name}</span>
      </nav>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-w-0 gap-8">

          {/* Product hero. Phones (<560px): the image is a centered block whose
              width tracks the viewport (min(14rem, 56vw)) so it grows/shrinks with
              the screen instead of sitting as a fixed 13rem block marooned in
              whitespace on wider phones (2026-07-20 report: "image on the side").
              A full-width square ate the whole first screen on a 390px phone, so it
              stays capped. From 560px up it becomes a side-by-side image+info grid,
              killing the awkward stranded-image zone between phone and md. */}
          <article className="grid min-w-0 gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5 min-[560px]:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)] min-[560px]:gap-5">
            <div className="mx-auto w-full max-w-[min(14rem,56vw)] self-center overflow-hidden rounded-lg border border-line bg-surface-soft min-[560px]:max-w-none min-[560px]:self-start">
              <ProductImage src={product.imageUrl ?? cheapest.imageUrl} alt={product.name} priority hero categorySlug={product.category?.slug} shopName={cheapest.shop.name} />
            </div>
            <div className="flex min-w-0 flex-col">
              {/* Hero carries only what decides a purchase: name, the best buyable
                  price and where it is, the spread across shops, one freshness
                  line and the CTA. Stats and history live in <details> below. */}
              <h1 className="font-display break-words text-xl font-bold leading-tight text-ink [overflow-wrap:anywhere] sm:text-[1.6rem]">
                {product.name}
              </h1>

              {/* Price */}
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-1 text-[12px] font-semibold text-muted">
                  {cheapestBuyable ? "საუკეთესო ფასი" : "ბოლო ცნობილი ფასი"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <PriceDisplay price={cheapest.currentPrice} oldPrice={cheapest.oldPrice} strong deal={cheapestDiscount > 0} />
                  {cheapestDiscount > 0 && <DiscountBadge percent={cheapestDiscount} />}
                </div>
                <p className="mt-2 text-[13px] leading-5 text-ink-soft">
                  {priceSummary.shopCount > 1 ? (
                    <>
                      {priceSummary.shopCount} მაღაზიაში · სხვაობა მაღაზიებს შორის{" "}
                      <strong className="font-semibold tabular-nums text-ink">{formatGel(priceSummary.difference)}</strong>
                    </>
                  ) : (
                    comparisonMessage
                  )}
                </p>
              </div>

              {/* Best shop, its stock and the one freshness line */}
              <div className="mt-3 flex items-center gap-3 rounded-control border border-line bg-surface-soft p-3">
                <ShopMark shop={cheapest.shop} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{cheapest.shop.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <AvailabilityBadge availability={cheapest.availability} />
                    <LastUpdatedText value={cheapest.lastSeenAt} warnStale className="text-xs" />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <ShopClickLink
                  offerId={cheapest.id}
                  productId={product.id}
                  productName={product.name}
                  category={product.category?.slug}
                  shopName={cheapest.shop.name}
                  price={cheapest.currentPrice}
                  sourceUrl={cheapest.url}
                  ariaLabel={`${cheapest.shop.name} შეთავაზება`}
                  className="btn-accent flex h-11 w-full items-center justify-center gap-2 px-5 text-sm sm:w-fit"
                >
                  მაღაზიაში გადასვლა
                  <ArrowUpRight className="size-4" />
                </ShopClickLink>
                <FavoriteToggle
                  variant="inline"
                  snapshot={{
                    slug: product.slug,
                    name: product.name,
                    price: cheapest.currentPrice,
                    oldPrice: cheapest.oldPrice,
                    imageUrl: product.imageUrl ?? cheapest.imageUrl,
                    shopName: cheapest.shop.name,
                    shopCount: priceSummary.shopCount,
                    categorySlug: product.category?.slug,
                  }}
                />
                <ShareButton title={product.name} />
              </div>

              {/* Secondary detail, collapsed by default (native, no client JS) */}
              <details className="group mt-4 rounded-control border border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[13px] font-semibold text-ink-soft [&::-webkit-details-marker]:hidden">
                  ფასების დეტალები და ისტორია
                  <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="grid gap-3 border-t border-line px-3 pb-3 pt-3">
                  {priceSummary.shopCount > 1 && (
                    <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4">
                      <StatCell label="დაბალი" value={formatGel(priceSummary.lowest)} />
                      <StatCell label="საშუალო" value={formatGel(priceSummary.average)} />
                      <StatCell label="მაღალი" value={formatGel(priceSummary.highest)} />
                      <StatCell label="სხვაობა" value={formatGel(priceSummary.difference)} accent />
                    </div>
                  )}
                  <PriceDirectionBadge currentPrice={cheapest.currentPrice} history={history} />
                  <PriceHistoryLowBadge currentPrice={cheapest.currentPrice} history={history} />
                  <p className="text-xs leading-5 text-muted">
                    {comparisonFreshnessText(product)} საბოლოო ფასი ყიდვამდე მაღაზიაში გადაამოწმე.
                  </p>
                </div>
              </details>
            </div>
          </article>

          {/* All offers table */}
          <div>
            <SectionHeader
              eyebrow="შედარება"
              title="ყველა შეთავაზება"
              description="ჯერ მარაგში არსებული შეთავაზებები, შემდეგ — ფასის მიხედვით."
            />
            <PriceDisclaimer compact />
            <div className="wire-table mt-3 overflow-hidden">
              {offerDetails.map(({ offer, attributes, match }, index) => {
                const offerDiscount = realDiscountPercent(offer);
                const outOfStock = offer.availability === "OUT_OF_STOCK";
                return (
                  <article
                    key={offer.id}
                    className={`wire-row grid min-w-0 gap-3 border-l-4 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
                      index === 0
                        ? "border-l-[var(--accent)] bg-surface"
                        : outOfStock
                          ? "border-l-transparent bg-surface-soft opacity-70"
                          : "border-l-transparent bg-surface"
                    }`}
                  >
                    <div className="flex min-w-0 gap-3">
                      <ShopMark shop={offer.shop} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-ink">{offer.shop.name}</p>
                          {index === 0 && !outOfStock && (
                            <span className="rounded-full bg-savings-strong px-2 py-0.5 text-[11px] font-bold text-white">
                              საუკეთესო ფასი
                            </span>
                          )}
                          {offerDiscount > 0 && <DiscountBadge percent={offerDiscount} />}
                          <ShopStatusBadge shop={offer.shop} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <AvailabilityBadge availability={offer.availability} />
                          <LastUpdatedText value={offer.lastSeenAt} warnStale className="text-[12px]" />
                          <MatchConfidenceBadge
                            confidence={offer.matchConfidence ?? match.confidence}
                            status={offer.matchStatus ?? match.status}
                            singleStore={priceSummary.shopCount === 1}
                          />
                        </div>
                        <p className="mt-1.5 break-words text-xs leading-5 text-muted">{offer.title}</p>
                        {attributeLabels(attributes).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {attributeLabels(attributes).map((label) => (
                              <span key={label} className="rounded-sm border border-line bg-surface-soft px-1.5 py-0.5 text-[12px] font-medium text-ink-soft">
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
                      <div className="flex flex-col items-end gap-1">
                        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} deal={offerDiscount > 0} />
                        <Sparkline history={offer.history} className="text-ink" />
                      </div>
                      <ShopClickLink
                        offerId={offer.id}
                        productId={product.id}
                        productName={product.name}
                        category={product.category?.slug}
                        shopName={offer.shop.name}
                        price={offer.currentPrice}
                        sourceUrl={offer.url}
                        ariaLabel={`${offer.shop.name} შეთავაზება`}
                        className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-ink-soft hover:border-line-strong hover:bg-surface-soft"
                      >
                        ნახვა
                        <ArrowUpRight className="size-3.5" />
                      </ShopClickLink>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Price history */}
          <div>
            <SectionHeader
              eyebrow="ისტორია"
              title="ფასის ცვლილება"
              description="ყოველი დღის დაბალი ფასი."
            />
            <PriceChart history={history} />
          </div>

          {/* Similar products — structured: variants → same brand → same price range */}
          {similarSections.length ? (
            similarSections.map((section) => (
              <div key={section.key}>
                <SectionHeader
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.description}
                  href={product.category ? `/categories/${product.category.slug}` : "/categories"}
                  action="კატეგორია"
                />
                <ProductGrid products={section.products} density="compact" priorityImages={0} />
              </div>
            ))
          ) : (
            <div>
              <SectionHeader
                eyebrow="კატეგორიიდან"
                title="მსგავსი პროდუქტები"
                href={product.category ? `/categories/${product.category.slug}` : "/categories"}
                action="კატეგორია"
              />
              <EmptyState
                title="მსგავსი პროდუქტები მალე გამოჩნდება"
                description="ამ კატეგორიაში ახალი შეთავაზებები დამატებისთანავე აქ გამოჩნდება."
                href="/categories"
                action="კატეგორიების ნახვა"
              />
            </div>
          )}

          {/* Recently viewed — client-side recents rail */}
          <RecentlyViewedStrip inline excludeSlug={product.slug} />
        </div>

        <aside className="grid h-fit min-w-0 gap-3 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <AlertForm
            productId={product.id}
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null}
            emailDelivery={activeEmailProvider() !== null}
          />
          <TrustNote compact />
        </aside>
      </div>
    </section>
  );
}

// Historical-low callout: reads the SAME daily-lowest series that feeds the
// price chart (no extra query) and compares the current cheapest offer to the
// lowest tracked price in the observed window. Renders nothing when there is
// too little history (<2 distinct day points) so we never fabricate a "low".
// Day-over-day movement of the best price: compares today's cheapest offer to
// the most recent PREVIOUS day's daily low from the tracked history. A drop is
// good news (solid ink chip, like DiscountBadge); a rise is a caution
// (outlined). Sub-₾0.5 wiggle is noise and renders nothing.
function PriceDirectionBadge({ currentPrice, history }: { currentPrice: number; history: HistoryPoint[] }) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;

  const todayKey = historyDayKey(new Date());
  const previousDays = history.filter((point) => Number.isFinite(point.price) && point.price > 0 && historyDayKey(new Date(point.capturedAt)) !== todayKey);
  const previousLow = previousDays.at(-1)?.price;
  if (!previousLow) return null;

  const delta = currentPrice - previousLow;
  if (Math.abs(delta) < 0.5) return null;

  const dropped = delta < 0;
  const Icon = dropped ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        dropped ? "bg-savings-soft text-savings-strong" : "bg-deal-soft text-deal-strong"
      }`}
    >
      <Icon className="size-3" />
      {dropped ? "−" : "+"}
      {formatGel(Math.abs(delta))} გუშინდელთან
    </span>
  );
}

function PriceHistoryLowBadge({ currentPrice, history }: { currentPrice: number; history: HistoryPoint[] }) {
  const prices = history.map((point) => point.price).filter((price) => Number.isFinite(price) && price > 0);
  if (prices.length < 2 || !Number.isFinite(currentPrice) || currentPrice <= 0) return null;

  const historicalLow = Math.min(...prices);
  if (!Number.isFinite(historicalLow) || historicalLow <= 0) return null;

  // Within ~1% of the tracked low (or below it) counts as "at its lowest".
  const atLow = currentPrice <= historicalLow * 1.01;
  const percentAbove = Math.round(((currentPrice - historicalLow) / historicalLow) * 100);

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">
        ისტორიული მინიმუმი: <strong className="font-semibold text-ink-soft">{formatGel(historicalLow)}</strong>
      </span>
      {atLow ? (
        <span
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
          style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, white)" }}
        >
          დაბალ ფასში
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
          ისტორიულ მინიმუმზე +{percentAbove}%
        </span>
      )}
    </div>
  );
}

function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className={`flex flex-col gap-0.5 rounded-md border p-2 ${accent ? "border-transparent bg-accent" : "border-line bg-surface-soft"}`}>
      <strong className={`text-[12px] font-semibold uppercase tracking-wider ${accent ? "text-white/60" : "text-muted"}`}>
        {label}
      </strong>
      <span className={`text-sm font-bold tabular-nums ${accent ? "text-white" : "text-ink"}`}>{value}</span>
    </span>
  );
}

function comparisonFreshnessText(product: { crossStoreCheckedAt?: string | null; checkedShopsCount?: number; totalEnabledShopsCount?: number }) {
  if (!product.crossStoreCheckedAt || !product.checkedShopsCount) return "სხვა მაღაზიების შემოწმება მიმდინარეობს.";
  const total = product.totalEnabledShopsCount ? `/${product.totalEnabledShopsCount}` : "";
  return `შემოწმებული წყაროები: ${product.checkedShopsCount}${total}.`;
}

// Four-tier match clarity labels: exact match, strong match, similar product,
// single-store listing. A "match" here is how confidently this shop's offer is
// the same variant as the product being compared. The confidence number is a
// matcher-internal score: it picks the tier but is never shown to shoppers.
function MatchConfidenceBadge({ confidence, status, singleStore = false }: { confidence: number; status: string; singleStore?: boolean }) {
  if (singleStore) {
    return (
      <span className="inline-flex items-center rounded-full border border-line bg-surface-soft px-1.5 py-0.5 text-[11px] font-medium text-muted">
        ერთი მაღაზიის შეთავაზება
      </span>
    );
  }
  const isPublic = isPublicMatchStatus(status);
  const tier =
    isPublic && confidence >= 95
      ? { label: "ზუსტი დამთხვევა", styles: "border-emerald-200 bg-emerald-50 text-emerald-700" }
      : isPublic && confidence >= 90
        ? { label: "ძლიერი დამთხვევა", styles: "border-line-strong bg-surface-mute text-ink" }
        : { label: "მსგავსი პროდუქტი", styles: "border-line-strong bg-surface text-muted" };
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${tier.styles}`}>
      {tier.label}
    </span>
  );
}

// Georgian labels; CPU / GPU / RAM / SKU / SIM stay as-is because those are
// the terms Georgian shops and shoppers use themselves.
function attributeLabels(attributes: ProductAttributes) {
  return [
    attributes.modelCodes[0] ? `მოდელი: ${attributes.modelCodes[0]}` : null,
    attributes.skuCodes[0] ? `SKU: ${attributes.skuCodes[0]}` : null,
    attributes.cpu ? `CPU: ${attributes.cpu}` : null,
    attributes.gpu ? `GPU: ${attributes.gpu}` : null,
    attributes.ram[0] ? `RAM: ${attributes.ram.join("/")}` : null,
    attributes.storage[0] ? `მეხსიერება: ${attributes.storage.join("/")}` : null,
    attributes.screenSize ? `ეკრანი: ${attributes.screenSize}` : null,
    attributes.sim ? `SIM: ${attributes.sim}` : null,
    attributes.os ? `ოპ. სისტემა: ${attributes.os}` : null,
    attributes.color ? `ფერი: ${attributes.color}` : null,
    attributes.capacity ? `ტევადობა: ${attributes.capacity}` : null,
  ].filter((label): label is string => Boolean(label));
}

function attributesWithIdentity(attributes: ProductAttributes, identity: unknown): ProductAttributes {
  const specs = identitySpecs(identity);
  return {
    ...attributes,
    ram: attributes.ram.length ? attributes.ram : memoryLabels(specs.ramGb),
    storage: attributes.storage.length ? attributes.storage : memoryLabels(specs.storageGb),
    screenSize: attributes.screenSize ?? specs.screenSize,
    sim: attributes.sim ?? specs.simType,
    os: attributes.os ?? specs.operatingSystem,
    color: attributes.color ?? specs.color,
  };
}

function identitySpecs(identity: unknown) {
  const record = objectRecord(identity);
  const specs = objectRecord(record.specs);
  return {
    storageGb: numberSpec(specs.storageGb ?? record.storageGb),
    ramGb: numberSpec(specs.ramGb ?? record.ramGb),
    screenSize: stringSpec(specs.screenSize ?? record.screenSize),
    simType: stringSpec(specs.simType ?? record.simType),
    operatingSystem: stringSpec(specs.operatingSystem ?? record.operatingSystem),
    color: stringSpec(specs.color ?? record.color),
  };
}

function memoryLabels(gb?: number) {
  if (gb == null || !Number.isFinite(gb) || gb <= 0) return [];
  if (gb < 1) return [`${Math.round(gb * 1024)}MB`];
  return [`${Number.isInteger(gb) ? gb : Number(gb.toFixed(1))}GB`];
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringSpec(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberSpec(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function offerPriceSummary(product: { offers: Array<{ currentPrice: number; shop: { id: string } }> }) {
  const prices = product.offers.map((offer) => offer.currentPrice).filter((price) => Number.isFinite(price) && price > 0);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  return {
    lowest,
    highest,
    average: Math.round(average * 100) / 100,
    difference: highest - lowest,
    shopCount: new Set(product.offers.map((offer) => offer.shop.id)).size,
  };
}

type SimilarSection = {
  key: string;
  eyebrow: string;
  title: string;
  description?: string;
  products: ProductView[];
};

// Structured "similar products": (1) other variants of the same model,
// (2) other products of the same brand, (3) same category in the same price
// range. Items appear in at most one section, and nothing outside the
// product's own category is ever suggested.
function buildSimilarSections(product: ProductView, categoryPool: ProductView[]): SimilarSection[] {
  const productBrand = similarKey(product.brand ?? firstWord(product.name));
  const productModel = similarKey(product.model);
  const cheapest = Math.min(...product.offers.map((offer) => offer.currentPrice).filter((price) => price > 0));
  const used = new Set<string>();
  const take = (pool: ProductView[], limit: number) => {
    const taken: ProductView[] = [];
    for (const item of pool) {
      if (used.has(item.id)) continue;
      used.add(item.id);
      taken.push(item);
      if (taken.length >= limit) break;
    }
    return taken;
  };

  const variants = productBrand && productModel
    ? take(
        categoryPool.filter(
          (item) => similarKey(item.brand) === productBrand && similarKey(item.model) === productModel,
        ),
        6,
      )
    : [];
  const sameBrand = productBrand
    ? take(categoryPool.filter((item) => similarKey(item.brand ?? firstWord(item.name)) === productBrand), 6)
    : [];
  const samePriceRange = Number.isFinite(cheapest)
    ? take(
        categoryPool.filter((item) => {
          const itemPrice = Math.min(...item.offers.map((offer) => offer.currentPrice).filter((price) => price > 0));
          return Number.isFinite(itemPrice) && itemPrice >= cheapest * 0.75 && itemPrice <= cheapest * 1.25;
        }),
        6,
      )
    : [];

  const sections: SimilarSection[] = [];
  if (variants.length) {
    sections.push({
      key: "variants",
      eyebrow: "იგივე მოდელი",
      title: "ამ მოდელის სხვა ვარიანტები",
      description: "განსხვავებული მეხსიერება, ფერი ან კონფიგურაცია.",
      products: variants,
    });
  }
  if (sameBrand.length) {
    sections.push({
      key: "same-brand",
      eyebrow: "იგივე ბრენდი",
      title: `კიდევ ${product.brand ?? firstWord(product.name)}-ის პროდუქტები`,
      products: sameBrand,
    });
  }
  if (samePriceRange.length) {
    sections.push({
      key: "same-price",
      eyebrow: "მსგავსი ფასი",
      title: "ალტერნატივები იმავე ფასის ფარგლებში",
      description: "იმავე კატეგორიიდან, შესადარებელ ფასად.",
      products: samePriceRange,
    });
  }
  return sections;
}

function similarKey(value?: string | null) {
  return (value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9Ⴀ-ჿ]+/g, " ").trim();
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

function dailyLowestHistory(history: { capturedAt: string; price: number }[]) {
  const lowestByDay = new Map<string, { capturedAt: string; price: number }>();

  for (const point of history) {
    const date = new Date(point.capturedAt);
    if (Number.isNaN(date.getTime()) || !Number.isFinite(point.price)) continue;

    const dayKey = historyDayKey(date);
    const lowestPoint = lowestByDay.get(dayKey);
    if (!lowestPoint || point.price < lowestPoint.price) lowestByDay.set(dayKey, point);
  }

  return [...lowestByDay.values()].sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
}

function historyDayKey(date: Date) {
  const parts = new Map(historyDayFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}
