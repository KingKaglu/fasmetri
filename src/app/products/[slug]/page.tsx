import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
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
    ? (await listPublicProducts({ category: product.category.slug, sort: "priority", pageSize: 18 })).filter((item) => item.id !== product.id).slice(0, 3)
    : [];

  return (
    <section className="shell py-7 sm:py-10">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-bold text-[#64748b]">
        <span>{product.category?.nameKa ?? "პროდუქტი"}</span>
        <span className="size-1 rounded-full bg-[#9ab0b4]" />
        <span>{product.offers.length} დადასტურებული შეთავაზება</span>
        <ComparisonCompletenessBadge product={product} />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 gap-8">
          <article className="surface-shadow grid min-w-0 gap-6 rounded-lg border bg-white p-4 sm:p-6 md:grid-cols-[minmax(16rem,23rem)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-lg border"><ProductImage src={product.imageUrl ?? cheapest.imageUrl} alt={product.name} priority /></div>
            <div className="flex min-w-0 flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-[#0054d2]">
                  {product.offers.length > 1 ? "დადასტურებულ შეთავაზებებში დაბალი ფასი" : "დადასტურებული შეთავაზება"}
                </p>
                <DiscountBadge percent={cheapest.discountPercent} />
              </div>
              <h1 className="mt-2 break-words text-3xl font-black leading-tight [overflow-wrap:anywhere] sm:text-4xl">{product.name}</h1>
              <p className="mt-3 leading-7 text-[#64748b]">
                {priceSummary.shopCount === 1
                  ? "ამ ეტაპზე პროდუქტი ნაპოვნია 1 მაღაზიაში. სხვა მაღაზიებში ფასი ჯერ არ დადასტურებულა."
                  : `ეს პროდუქტი ნაპოვნია ${priceSummary.shopCount} მაღაზიაში. დადასტურებულ შეთავაზებებში ყველაზე დაბალი ფასი არის ${formatGel(priceSummary.lowest)}.`}
              </p>
              <p className="mt-2 text-sm font-bold text-[#64748b]">{comparisonFreshnessText(product)}</p>
              <div className="mt-5"><PriceDisplay price={cheapest.currentPrice} oldPrice={cheapest.oldPrice} strong /></div>
              {priceSummary.shopCount > 1 ? (
                <div className="mt-5 grid gap-2 text-sm font-bold min-[420px]:grid-cols-2 xl:grid-cols-4">
                  <span className="rounded-md border bg-[#f8fafc] p-3"><strong className="block text-[#003f9f]">დაბალი დადასტურებული ფასი</strong>{formatGel(priceSummary.lowest)}</span>
                  <span className="rounded-md border bg-[#f8fafc] p-3"><strong className="block text-[#003f9f]">საშუალო ფასი</strong>{formatGel(priceSummary.average)}</span>
                  <span className="rounded-md border bg-[#f8fafc] p-3"><strong className="block text-[#003f9f]">უმაღლესი ფასი</strong>{formatGel(priceSummary.highest)}</span>
                  <span className="rounded-md border bg-[#fff4dd] p-3"><strong className="block text-[#c2410c]">ფასის სხვაობა</strong>{formatGel(priceSummary.difference)}</span>
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap items-start gap-2 text-sm font-bold">
                <AvailabilityBadge availability={cheapest.availability} />
                <span className="rounded-md border bg-[#f8fafc] px-3 py-2"><LastUpdatedText value={cheapest.lastSeenAt} exact className="font-bold" /></span>
              </div>
              <div className="mt-5 flex min-w-0 items-center gap-3 rounded-lg border bg-[#f8fafc] p-3">
                <ShopMark shop={cheapest.shop} />
                <div className="min-w-0">
                  <p className="truncate font-black">{cheapest.shop.name}</p>
                  <p className="text-sm font-bold text-[#64748b]">საბოლოო ფასი მაღაზიაში გადაამოწმე</p>
                </div>
              </div>
              <a href={`/api/out/${cheapest.id}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-md bg-[#0054d2] px-5 font-black text-white shadow-[0_14px_32px_rgba(0,84,210,.24)] hover:bg-[#003f9f]">
                მაღაზიაში ნახვა
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </article>

          <div>
            <SectionHeader eyebrow="ყველა შეთავაზება" title="ფასების შედარება" description="ყველაზე დაბალი დაფიქსირებული შეთავაზება პირველია." />
            <div className="grid gap-3">
              {offerDetails.map(({ offer, attributes, match }, index) => (
                <article key={offer.id} className={`grid min-w-0 gap-4 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${index === 0 ? "border-[#b8cdf0] ring-2 ring-[#d9efe9]" : ""}`}>
                  <div className="flex min-w-0 gap-3">
                    <ShopMark shop={offer.shop} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black">{offer.shop.name}</p>
                        {index === 0 ? <span className="rounded-md bg-[#12203a] px-2.5 py-1 text-xs font-black text-white">დადასტურებულებში იაფი</span> : null}
                        <ShopStatusBadge shop={offer.shop} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-start gap-2">
                        <AvailabilityBadge availability={offer.availability} />
                        <LastUpdatedText value={offer.lastSeenAt} exact className="text-sm font-bold" />
                        <MatchConfidenceBadge confidence={match.confidence} status={match.status} />
                      </div>
                      <p className="mt-3 break-words text-sm font-bold leading-6 text-[#12203a]">{offer.title}</p>
                      {attributeLabels(attributes).length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {attributeLabels(attributes).map((label) => <span key={label} className="rounded-md border bg-[#f8fafc] px-2 py-1 text-xs font-bold text-[#64748b]">{label}</span>)}
                        </div>
                      ) : <p className="mt-2 text-xs font-bold text-[#64748b]">ვარიანტის დამატებითი ატრიბუტები სათაურში ვერ დადასტურდა.</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} />
                    <a href={`/api/out/${offer.id}`} target="_blank" rel="noreferrer" aria-label={`${offer.shop.name} მაღაზიაში ნახვა`} className="inline-flex h-11 items-center gap-2 rounded-md border px-3 font-black text-[#0054d2] hover:border-[#0054d2] hover:bg-[#eef5ff]">
                      მაღაზიაში ნახვა
                      <ArrowUpRight className="size-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader eyebrow="ბოლო ცვლილებები" title="ფასის ისტორია" description="ყოველი დღის ყველაზე დაბალი დაფიქსირებული ფასი." />
            <PriceChart history={history} />
          </div>

          <div>
            <SectionHeader eyebrow="კატეგორიიდან" title="მსგავსი პროდუქტები" href={product.category ? `/categories/${product.category.slug}` : "/categories"} action="კატეგორიები" />
            {similar.length ? <ProductGrid products={similar} /> : (
              <EmptyState
                title="მსგავსი პროდუქტები მალე გამოჩნდება"
                description="ამ კატეგორიაში ახალი შეთავაზებები დამატებისთანავე აქ გამოჩნდება."
                href="/categories"
                action="კატეგორიების ნახვა"
              />
            )}
          </div>
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-28">
          <AlertForm productId={product.id} />
          <TrustNote compact />
          <p className="rounded-lg border bg-white p-4 text-sm font-bold leading-6 text-[#64748b]">შედარება ეფუძნება ამ დროისთვის დადასტურებულ შეთავაზებებს.</p>
        </aside>
      </div>
    </section>
  );
}

function ComparisonCompletenessBadge({ product }: { product: { checkedShopsCount?: number; totalEnabledShopsCount?: number; missingOfferDiscoveryStatus?: string | null } }) {
  const label = product.checkedShopsCount ? "მონაცემები ნაწილობრივია" : "შემოწმება მიმდინარეობს";
  return <span className="rounded-md border bg-[#f8fafc] px-2 py-1 text-xs font-black text-[#003f9f]">{label}</span>;
}

function comparisonFreshnessText(product: { crossStoreCheckedAt?: string | null; checkedShopsCount?: number; totalEnabledShopsCount?: number }) {
  if (!product.crossStoreCheckedAt || !product.checkedShopsCount) return "სხვა მაღაზიების შემოწმება მიმდინარეობს.";
  return `დამუშავებული წყაროები: ${product.checkedShopsCount}. სრული კატალოგის განახლება გრძელდება.`;
}

function MatchConfidenceBadge({ confidence, status }: { confidence: number; status: string }) {
  const label = status === "CONFIRMED" ? "დადასტურებული იგივე პროდუქტი" : status === "POSSIBLE" ? "საჭიროებს შემოწმებას" : "სხვა ვარიაციაა";
  return <span className="rounded-md border bg-[#edf3ff] px-2 py-1 text-xs font-black text-[#24458f]">{label} · {confidence}%</span>;
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
