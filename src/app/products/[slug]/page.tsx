import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, ChevronRight } from "lucide-react";
import { getPublicProduct, listPublicProducts } from "@/lib/catalog";
import { isPublicMatchStatus } from "@/lib/catalog-types";
import { PriceChart } from "@/components/price-chart";
import { AlertForm } from "@/components/alert-form";
import { ProductGrid } from "@/components/product-grid";
import { ShopClickLink } from "@/components/shop-click-link";
import { TrackView } from "@/components/track-view";
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
export const revalidate = 600;

const historyDayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tbilisi",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getPublicProduct((await params).slug);
  if (!product) {
    return {
      title: "პროდუქტი ვერ მოიძებნა",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${product.name} ფასების შედარება`,
    description: `${product.name} ფასები და შეთავაზებები ქართულ ონლაინ მაღაზიებში.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} ფასების შედარება — ფასმეტრი`,
      description: `${product.name} ფასები და შეთავაზებები ქართულ ონლაინ მაღაზიებში.`,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getPublicProduct((await params).slug);
  if (!product || !product.offers[0]) notFound();

  const cheapest = product.offers[0];
  const history = dailyLowestHistory(product.offers.flatMap((offer) => offer.history ?? []));
  const priceSummary = offerPriceSummary(product);
  const cheapestDiscount = realDiscountPercent(cheapest);
  const latestUpdate = latestOfferSeenAt(product.offers) ?? cheapest.lastSeenAt;
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
  const exactMatchCount = offerDetails.filter(({ offer, match }) => isExactMatch(offer, match)).length;
  const dataConfidence = dataConfidenceLabel(product, offerDetails);
  const comparisonMessage =
    priceSummary.shopCount === 1
      ? "ამ დროისთვის ეს პროდუქტი მხოლოდ ერთ მაღაზიაშია ნაპოვნი."
      : "ფასები შედარებულია რამდენიმე მაღაზიიდან.";
  const similar = product.category
    ? (await listPublicProducts({ category: product.category.slug, sort: "priority", pageSize: 18 })).filter((item) => item.id !== product.id).slice(0, 6)
    : [];

  return (
    <section className="shell py-5 sm:py-8">
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
      <nav aria-label="ნავიგაცია" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-700">მთავარი</Link>
        <ChevronRight className="size-3" />
        {product.category ? (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-gray-700">
              {product.category.nameKa}
            </Link>
            <ChevronRight className="size-3" />
          </>
        ) : null}
        <span className="truncate font-medium text-gray-700">{product.name}</span>
      </nav>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-w-0 gap-8">

          {/* Product hero */}
          <article className="grid min-w-0 gap-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              <ProductImage src={product.imageUrl ?? cheapest.imageUrl} alt={product.name} priority />
            </div>
            <div className="flex min-w-0 flex-col">
              {/* Badges row */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  <BadgeCheck className="mr-1 inline size-3 text-green-500" />
                  {product.offers.length > 1 ? `${product.offers.length} შეთავაზება` : "1 შეთავაზება"}
                </span>
                {cheapestDiscount > 0 && <DiscountBadge percent={cheapestDiscount} />}
              </div>

              <h1 className="break-words text-xl font-bold leading-tight text-gray-900 [overflow-wrap:anywhere] sm:text-2xl">
                {product.name}
              </h1>
              <p className="mt-1.5 text-xs leading-5 text-gray-500">{comparisonMessage} {comparisonFreshnessText(product)}</p>

              {/* Price */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">საუკეთესო ფასი</p>
                <PriceDisplay price={cheapest.currentPrice} oldPrice={cheapest.oldPrice} strong deal={cheapestDiscount > 0} />
              </div>

              {/* Price stats */}
              {priceSummary.shopCount > 1 && (
                <div className="mt-3 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4">
                  <StatCell label="დაბალი" value={formatGel(priceSummary.lowest)} />
                  <StatCell label="საშუალო" value={formatGel(priceSummary.average)} />
                  <StatCell label="მაღალი" value={formatGel(priceSummary.highest)} />
                  <StatCell label="სხვაობა" value={formatGel(priceSummary.difference)} accent />
                </div>
              )}

              {/* Availability + update time */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <AvailabilityBadge availability={cheapest.availability} />
                <LastUpdatedText value={cheapest.lastSeenAt} className="text-xs text-gray-400" />
              </div>

              {/* Trust metrics */}
              <div className="mt-3 grid gap-1.5 min-[420px]:grid-cols-3">
                <TrustMetric label="ბოლო განახლება" value={<LastUpdatedText value={latestUpdate} exact />} />
                <TrustMetric label="სიზუსტე" value={dataConfidence} />
                <TrustMetric label="ზუსტი დამთხვევა" value={`${exactMatchCount}/${product.offers.length}`} />
              </div>

              {/* Best shop + CTA */}
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <ShopMark shop={cheapest.shop} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{cheapest.shop.name}</p>
                  <p className="text-[11px] text-gray-500">საბოლოო ფასი მაღაზიაში გადაამოწმე</p>
                </div>
              </div>

              <ShopClickLink
                offerId={cheapest.id}
                productId={product.id}
                productName={product.name}
                category={product.category?.slug}
                shopName={cheapest.shop.name}
                price={cheapest.currentPrice}
                sourceUrl={cheapest.url}
                ariaLabel={`${cheapest.shop.name} შეთავაზება`}
                className="mt-3 flex h-11 w-fit items-center gap-2 rounded-md bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-black"
              >
                შეთავაზების ნახვა
                <ArrowUpRight className="size-4" />
              </ShopClickLink>
            </div>
          </article>

          {/* All offers table */}
          <div>
            <SectionHeader
              eyebrow="შედარება"
              title="ყველა შეთავაზება"
              description="დალაგებულია ფასით — საუკეთესო პირველია."
            />
            <PriceDisclaimer compact />
            <div className="mt-3 grid gap-2">
              {offerDetails.map(({ offer, attributes, match }, index) => {
                const offerDiscount = realDiscountPercent(offer);
                return (
                  <article
                    key={offer.id}
                    className={`grid min-w-0 gap-3 rounded-lg border bg-white p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
                      index === 0
                        ? "border-blue-300 ring-1 ring-blue-200"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex min-w-0 gap-3">
                      <ShopMark shop={offer.shop} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900">{offer.shop.name}</p>
                          {index === 0 && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              საუკეთესო
                            </span>
                          )}
                          {offerDiscount > 0 && <DiscountBadge percent={offerDiscount} />}
                          <ShopStatusBadge shop={offer.shop} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <AvailabilityBadge availability={offer.availability} />
                          <LastUpdatedText value={offer.lastSeenAt} className="text-[10px] text-gray-400" />
                          <MatchConfidenceBadge confidence={offer.matchConfidence ?? match.confidence} status={offer.matchStatus ?? match.status} />
                        </div>
                        <p className="mt-1.5 break-words text-xs leading-5 text-gray-500">{offer.title}</p>
                        {attributeLabels(attributes).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {attributeLabels(attributes).map((label) => (
                              <span key={label} className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
                      <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} deal={offerDiscount > 0} />
                      <ShopClickLink
                        offerId={offer.id}
                        productId={product.id}
                        productName={product.name}
                        category={product.category?.slug}
                        shopName={offer.shop.name}
                        price={offer.currentPrice}
                        sourceUrl={offer.url}
                        ariaLabel={`${offer.shop.name} შეთავაზება`}
                        className="flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
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

          {/* Similar products */}
          <div>
            <SectionHeader
              eyebrow="კატეგორიიდან"
              title="მსგავსი პროდუქტები"
              href={product.category ? `/categories/${product.category.slug}` : "/categories"}
              action="კატეგორია"
            />
            {similar.length ? (
              <ProductGrid products={similar} density="compact" />
            ) : (
              <EmptyState
                title="მსგავსი პროდუქტები მალე გამოჩნდება"
                description="ამ კატეგორიაში ახალი შეთავაზებები დამატებისთანავე აქ გამოჩნდება."
                href="/categories"
                action="კატეგორიების ნახვა"
              />
            )}
          </div>
        </div>

        <aside className="grid h-fit gap-3 lg:sticky lg:top-[4.5rem]">
          <AlertForm productId={product.id} />
          <TrustNote compact />
        </aside>
      </div>
    </section>
  );
}

function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className={`flex flex-col gap-0.5 rounded-md border p-2 ${accent ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
      <strong className={`text-[10px] font-semibold uppercase tracking-wider ${accent ? "text-green-700" : "text-gray-400"}`}>
        {label}
      </strong>
      <span className={`text-sm font-bold tabular-nums ${accent ? "text-green-700" : "text-gray-900"}`}>{value}</span>
    </span>
  );
}

function TrustMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="mt-1 block text-xs font-semibold leading-5 text-gray-700">{value}</span>
    </span>
  );
}

function comparisonFreshnessText(product: { crossStoreCheckedAt?: string | null; checkedShopsCount?: number; totalEnabledShopsCount?: number }) {
  if (!product.crossStoreCheckedAt || !product.checkedShopsCount) return "სხვა მაღაზიების შემოწმება მიმდინარეობს.";
  const total = product.totalEnabledShopsCount ? `/${product.totalEnabledShopsCount}` : "";
  return `შემოწმებული წყაროები: ${product.checkedShopsCount}${total}.`;
}

function MatchConfidenceBadge({ confidence, status }: { confidence: number; status: string }) {
  const label = status === "CONFIRMED" ? "ზუსტი მოდელის დამთხვევა" : status === "POSSIBLE" ? "მონაცემი მოწმდება" : "სხვა ვარიანტი";
  const styles =
    status === "CONFIRMED"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "POSSIBLE"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-gray-50 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${styles}`}>
      {label} · {confidence}%
    </span>
  );
}

function isExactMatch(offer: { matchStatus?: string | null; matchConfidence?: number | null; verificationStatus?: string | null }, match: { status: string; confidence: number }) {
  const confidence = offer.matchConfidence ?? match.confidence;
  return isPublicMatchStatus(offer.matchStatus ?? match.status) && offer.verificationStatus === "CONFIRMED" && confidence >= 90;
}

function dataConfidenceLabel(
  product: { categoryConfidence?: number | null },
  offerDetails: Array<{ offer: { matchConfidence?: number | null }; match: { confidence: number } }>,
) {
  const values = [
    product.categoryConfidence,
    ...offerDetails.map(({ offer, match }) => offer.matchConfidence ?? match.confidence),
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return "დადასტურებული შეთავაზებები";
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const label = average >= 95 ? "მაღალი" : average >= 85 ? "კარგი" : "მოწმდება";
  return `${label} · ${average}%`;
}

function latestOfferSeenAt(offers: Array<{ lastSeenAt: string }>) {
  return offers
    .map((offer) => offer.lastSeenAt)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
}

function attributeLabels(attributes: ProductAttributes) {
  return [
    attributes.modelCodes[0] ? `Model: ${attributes.modelCodes[0]}` : null,
    attributes.skuCodes[0] ? `SKU: ${attributes.skuCodes[0]}` : null,
    attributes.cpu ? `CPU: ${attributes.cpu}` : null,
    attributes.gpu ? `GPU: ${attributes.gpu}` : null,
    attributes.ram[0] ? `RAM: ${attributes.ram.join("/")}` : null,
    attributes.storage[0] ? `Storage: ${attributes.storage.join("/")}` : null,
    attributes.screenSize ? `Screen: ${attributes.screenSize}` : null,
    attributes.sim ? `SIM: ${attributes.sim}` : null,
    attributes.os ? `OS: ${attributes.os}` : null,
    attributes.color ? `Color: ${attributes.color}` : null,
    attributes.capacity ? `Capacity: ${attributes.capacity}` : null,
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
