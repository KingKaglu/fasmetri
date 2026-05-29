import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { getPublicProduct, listPublicProducts } from "@/lib/catalog";
import { PriceChart } from "@/components/price-chart";
import { AlertForm } from "@/components/alert-form";
import { ProductGrid } from "@/components/product-grid";
import {
  AvailabilityBadge,
  DiscountBadge,
  LastUpdatedText,
  PriceDisplay,
  ProductImage,
  SectionHeader,
  ShopMark,
  ShopStatusBadge,
  TrustNote,
  EmptyState,
} from "@/components/public-ui";
import { formatGel } from "@/lib/format";
import { extractProductAttributes, ProductAttributes } from "@/lib/productNormalization";
import { extractProductIdentity, readProductIdentity } from "@/lib/productIdentity";
import { explainMatchDecision } from "@/lib/productMatching";

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
  const productIdentity = readProductIdentity(product.productIdentity) ?? extractProductIdentity({
    title: product.name,
    brand: product.brand,
    model: product.model,
    categorySlug: product.category?.slug,
  });
  const offerDetails = product.offers.map((offer) => ({
    offer,
    attributes: extractProductAttributes({ title: offer.title, categorySlug: product.category?.slug }),
    match: explainMatchDecision(
      productIdentity,
      readProductIdentity(offer.productIdentity) ?? extractProductIdentity({ title: offer.title, categorySlug: product.category?.slug }),
    ),
  }));
  const similar = product.category
    ? (await listPublicProducts({ category: product.category.slug, sort: "priority", pageSize: 18 })).filter((item) => item.id !== product.id).slice(0, 6)
    : [];

  return (
    <section className="shell py-5 sm:py-8">
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
            <div className="overflow-hidden rounded-md border border-[#e2e8f0] bg-white">
              <ProductImage src={product.imageUrl ?? cheapest.imageUrl} alt={product.name} priority />
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow text-[#65a30d]">
                  {product.offers.length > 1 ? `${product.offers.length} შეთავაზება` : "1 შეთავაზება"}
                </p>
                {cheapest.discountPercent > 0 && <DiscountBadge percent={cheapest.discountPercent} />}
              </div>
              <h1 className="mt-1.5 break-words text-2xl font-black leading-tight tracking-tight text-[#0f172a] [overflow-wrap:anywhere] sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#64748b]">
                {priceSummary.shopCount === 1
                  ? "პროდუქტი ნაპოვნია 1 მაღაზიაში."
                  : `ნაპოვნია ${priceSummary.shopCount} მაღაზიაში. ყველაზე დაბალი ფასი: ${formatGel(priceSummary.lowest)}.`}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#94a3b8]">{comparisonFreshnessText(product)}</p>

              <div className="mt-4">
                <PriceDisplay price={cheapest.currentPrice} oldPrice={cheapest.oldPrice} strong deal={cheapest.discountPercent > 0} />
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
                <span className="inline-flex items-center rounded-sm border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-[11px] font-bold text-[#64748b]">
                  <LastUpdatedText value={cheapest.lastSeenAt} exact />
                </span>
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-3 rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <ShopMark shop={cheapest.shop} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#0f172a]">{cheapest.shop.name}</p>
                  <p className="text-[11px] font-bold text-[#64748b]">საბოლოო ფასი მაღაზიაში გადაამოწმე</p>
                </div>
              </div>

              <a
                href={`/api/out/${cheapest.id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-12 w-fit items-center gap-2 rounded-md bg-[#0f172a] px-6 text-sm font-black text-white hover:bg-black"
              >
                ნახე მაღაზიაში
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </article>

          {/* All offers */}
          <div>
            <SectionHeader
              eyebrow="ყველა შეთავაზება"
              title="ფასების შედარება"
              description="დაბალი ფასი პირველია."
            />
            <div className="grid gap-2">
              {offerDetails.map(({ offer, attributes, match }, index) => (
                <article
                  key={offer.id}
                  className={`grid min-w-0 gap-3 rounded-md border bg-white p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
                    index === 0 ? "border-[#84cc16] ring-1 ring-[#84cc16]" : "border-[#e2e8f0]"
                  }`}
                >
                  <div className="flex min-w-0 gap-3">
                    <ShopMark shop={offer.shop} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-[#0f172a]">{offer.shop.name}</p>
                        {index === 0 ? (
                          <span className="inline-flex items-center rounded-sm bg-[#84cc16] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1a2e05]">
                            დაბალი ფასი
                          </span>
                        ) : null}
                        <ShopStatusBadge shop={offer.shop} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <AvailabilityBadge availability={offer.availability} />
                        <LastUpdatedText value={offer.lastSeenAt} className="text-[11px] font-bold" />
                        <MatchConfidenceBadge confidence={match.confidence} status={match.status} />
                      </div>
                      <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#64748b]">{offer.title}</p>
                      {attributeLabels(attributes).length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {attributeLabels(attributes).map((label) => (
                            <span key={label} className="inline-flex items-center rounded-sm border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 text-[10px] font-bold text-[#475569]">
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
                    <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} deal={offer.discountPercent > 0} />
                    <a
                      href={`/api/out/${offer.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${offer.shop.name} მაღაზიაში ნახვა`}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#0f172a] px-3 text-xs font-bold text-white hover:bg-black"
                    >
                      მაღაზიაში
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  </div>
                </article>
              ))}
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
    <span className={`flex flex-col gap-0.5 rounded-md border p-2 ${accent ? "border-[#fed7aa] bg-[#fff7ed]" : "border-[#e2e8f0] bg-[#f8fafc]"}`}>
      <strong className={`text-[10px] font-black uppercase tracking-wider ${accent ? "text-[#c2410c]" : "text-[#64748b]"}`}>
        {label}
      </strong>
      <span className={`text-sm font-black tabular-nums ${accent ? "text-[#c2410c]" : "text-[#0f172a]"}`}>{value}</span>
    </span>
  );
}

function comparisonFreshnessText(product: { crossStoreCheckedAt?: string | null; checkedShopsCount?: number; totalEnabledShopsCount?: number }) {
  if (!product.crossStoreCheckedAt || !product.checkedShopsCount) return "სხვა მაღაზიების შემოწმება მიმდინარეობს.";
  return `დამუშავებული წყაროები: ${product.checkedShopsCount}.`;
}

function MatchConfidenceBadge({ confidence, status }: { confidence: number; status: string }) {
  const label = status === "CONFIRMED" ? "დადასტურებული" : status === "POSSIBLE" ? "მოწმდება" : "სხვა ვარიანტი";
  const styles =
    status === "CONFIRMED"
      ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d]"
      : status === "POSSIBLE"
        ? "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
        : "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]";
  return (
    <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold ${styles}`}>
      {label} · {confidence}%
    </span>
  );
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
