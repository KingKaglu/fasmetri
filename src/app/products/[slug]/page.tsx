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
      <nav aria-label="ნავიგაცია" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#64748b]">
        <Link href="/" className="hover:text-[#0f172a]">მთავარი</Link>
        <ChevronRight className="size-3" />
        {product.category ? (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-[#0f172a]">
              {product.category.nameKa}
            </Link>
            <ChevronRight className="size-3" />
          </>
        ) : null}
        <span className="truncate text-[#0f172a]">{product.name}</span>
      </nav>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-8">

          {/* Product hero */}
          <article className="surface-flat grid min-w-0 gap-5 p-4 sm:p-5 md:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
              <ProductImage src={product.imageUrl ?? cheapest.imageUrl} alt={product.name} priority />
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow text-[var(--accent-strong)]">
                  {product.offers.length > 1 ? `${product.offers.length} შეთავაზება` : "1 შეთავაზება"}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[10px] font-black text-[var(--muted-strong)]">
                  <BadgeCheck className="size-3" />
                  {comparisonMessage}
                </span>
                {cheapestDiscount > 0 && <DiscountBadge percent={cheapestDiscount} />}
              </div>
              <h1 className="mt-1.5 break-words text-2xl font-black leading-tight tracking-tight text-[var(--brand)] [overflow-wrap:anywhere] sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
                {comparisonMessage} ყველაზე დაბალი ფასი არის <span className="font-black text-[var(--brand)]">{formatGel(priceSummary.lowest)}</span>.
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{comparisonFreshnessText(product)}</p>

              <div className="mt-4">
                <p className="mb-1 text-[11px] font-black uppercase text-[var(--accent-strong)]">საუკეთესო ფასი</p>
                <PriceDisplay price={cheapest.currentPrice} oldPrice={cheapest.oldPrice} strong deal={cheapestDiscount > 0} />
              </div>

              {priceSummary.shopCount > 1 ? (
                <div className="mt-4 grid gap-2 text-xs font-bold min-[420px]:grid-cols-2 lg:grid-cols-4">
                  <StatCell label="დაბალი" value={formatGel(priceSummary.lowest)} />
                  <StatCell label="საშუალო" value={formatGel(priceSummary.average)} />
                  <StatCell label="უმაღლესი" value={formatGel(priceSummary.highest)} />
                  <StatCell label="სხვაობა" value={formatGel(priceSummary.difference)} accent />
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AvailabilityBadge availability={cheapest.availability} />
                <span className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-bold text-[var(--muted)]">
                  <LastUpdatedText value={cheapest.lastSeenAt} exact />
                </span>
              </div>

              <div className="mt-4 grid gap-2 min-[420px]:grid-cols-3">
                <TrustMetric label="ბოლო განახლება" value={<LastUpdatedText value={latestUpdate} exact />} />
                <TrustMetric label="მონაცემების სიზუსტე" value={dataConfidence} />
                <TrustMetric label="ზუსტი მოდელის დამთხვევა" value={`${exactMatchCount}/${product.offers.length} შეთავაზება`} />
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
                <ShopMark shop={cheapest.shop} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[var(--brand)]">{cheapest.shop.name}</p>
                  <p className="text-[11px] font-bold text-[var(--muted)]">საბოლოო ფასი მაღაზიის ვებსაიტზე გადაამოწმე</p>
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
                ariaLabel={`${cheapest.shop.name} შეთავაზების ნახვა`}
                className="btn-primary mt-4 inline-flex h-12 w-fit items-center gap-2 px-6 text-sm"
              >
                შეთავაზების ნახვა
                <ArrowUpRight className="size-4" />
              </ShopClickLink>
            </div>
          </article>

          {/* All offers */}
          <div>
            <SectionHeader
              eyebrow="ყველა შეთავაზება"
              title="ფასების შედარება"
              description="ყველა შეთავაზება დალაგებულია ფასით. საუკეთესო ფასი პირველია."
            />
            <PriceDisclaimer compact />
            <div className="mt-3 grid gap-2">
              {offerDetails.map(({ offer, attributes, match }, index) => {
                const offerDiscount = realDiscountPercent(offer);
                return (
                <article
                  key={offer.id}
                  className={`grid min-w-0 gap-3 rounded-xl border bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)] sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
                    index === 0 ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex min-w-0 gap-3">
                    <ShopMark shop={offer.shop} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-[var(--brand)]">{offer.shop.name}</p>
                        {index === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--accent-ink)]">
                            საუკეთესო ფასი
                          </span>
                        ) : null}
                        {offerDiscount > 0 ? <DiscountBadge percent={offerDiscount} /> : null}
                        <ShopStatusBadge shop={offer.shop} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <AvailabilityBadge availability={offer.availability} />
                        <LastUpdatedText value={offer.lastSeenAt} className="text-[11px] font-bold" />
                        <MatchConfidenceBadge confidence={offer.matchConfidence ?? match.confidence} status={offer.matchStatus ?? match.status} />
                      </div>
                      <p className="mt-2 break-words text-xs font-semibold leading-5 text-[var(--muted)]">{offer.title}</p>
                      {attributeLabels(attributes).length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {attributeLabels(attributes).map((label) => (
                            <span key={label} className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted-strong)]">
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
                      ariaLabel={`${offer.shop.name} შეთავაზების ნახვა`}
                      className="btn-outline inline-flex h-10 items-center gap-1.5 px-3 text-xs"
                    >
                      შეთავაზების ნახვა
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
              eyebrow="ფასის ისტორია"
              title="ბოლო ცვლილებები"
              description="ყოველი დღის დაბალი ფასი."
            />
            <PriceChart history={history} />
          </div>

          {/* Similar */}
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

        <aside className="grid h-fit gap-3 lg:sticky lg:top-24">
          <AlertForm productId={product.id} />
          <TrustNote compact />
        </aside>
      </div>
    </section>
  );
}

function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className={`flex flex-col gap-0.5 rounded-xl border p-2 ${accent ? "border-[#fed7aa] bg-[#fff7ed]" : "border-[var(--line)] bg-[var(--surface-soft)]"}`}>
      <strong className={`text-[10px] font-black uppercase tracking-wider ${accent ? "text-[#c2410c]" : "text-[var(--muted)]"}`}>
        {label}
      </strong>
      <span className={`text-sm font-black tabular-nums ${accent ? "text-[#c2410c]" : "text-[var(--brand)]"}`}>{value}</span>
    </span>
  );
}

function TrustMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">
      <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="mt-1 block text-xs font-black leading-5 text-[var(--brand)]">{value}</span>
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
      ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d]"
      : status === "POSSIBLE"
        ? "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
        : "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]";
  return (
    <span className={`inline-flex items-center rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${styles}`}>
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
