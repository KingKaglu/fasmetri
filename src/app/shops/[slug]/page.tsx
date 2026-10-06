import { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { CatalogPager } from "@/components/catalog-pager";
import { LastUpdatedText, ShopMark, ShopStatusBadge } from "@/components/public-ui";
import { formatNumber } from "@/lib/format";

// No loading.tsx for this segment: a route-level skeleton makes Next stream
// the response, which flushes a 200 before notFound() can run — unknown
// slugs then answer 200 with a not-found body, which Search Console reads
// as a soft 404. Serving the real 404 is worth more than the skeleton.

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const productPageSize = 36;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const shop = (await listPublicShops()).find((item) => item.slug === slug);
  // Matches the page's own guard so both agree on one condition.
  if (!shop || !shop.enabled || (shop.productCount ?? 0) <= 0) notFound();
  return {
    title: `${shop.name} შეთავაზებები`,
    description: `${shop.name} პროდუქტები, ფასები და აქციები ფასმეტრში.`,
    alternates: { canonical: `/shops/${shop.slug}` },
  };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Params }) {
  const slug = (await params).slug;
  const raw = await searchParams;
  const page = pageNumber(one(raw.page));
  const [shops, products] = await Promise.all([listPublicShops(), listPublicProducts({ shop: slug, sort: "updated", page, pageSize: productPageSize })]);
  const shop = shops.find((item) => item.slug === slug);
  if (!shop || !shop.enabled || (shop.productCount ?? 0) <= 0) notFound();
  if (page > 1 && products.length === 0) notFound();

  return (
    <section className="shell py-6 sm:py-9">
      <div className="mb-5 grid gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <ShopMark shop={shop} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{shop.name}</h1>
            <ShopStatusBadge shop={shop} />
          </div>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-ink">{formatNumber(shop.productCount ?? products.length)}</span> ამ მაღაზიაში ნაპოვნი პროდუქტი
            {" · "}
            <span className="font-semibold text-ink">{formatNumber(shop.dealCount ?? 0)}</span> აქტიური აქცია
            {" · "}
            ნაჩვენებია {formatNumber(products.length)} / {formatNumber(shop.productCount ?? products.length)}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
            ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს წარმოდგენილი, ამიტომ შეთავაზებების რაოდენობა შეიძლება პროდუქტის რაოდენობაზე მეტი იყოს.
          </p>
          {shop.lastScrapedAt ? <LastUpdatedText value={shop.lastScrapedAt} warnStale className="mt-1 text-xs" /> : null}
        </div>
        <p className="rounded-md border border-line bg-surface-soft px-3 py-2 text-xs font-medium text-muted">
          საბოლოო ფასი მაღაზიაში გადაამოწმე
        </p>
      </div>
      <ProductGrid products={products} resetHref={`/shops/${shop.slug}`} emptyTitle="შეთავაზებები მალე გამოჩნდება" emptyDescription="ამ მაღაზიის პროდუქტები დამატებისთანავე გამოჩნდება ფასების შედარებაში." />
      <CatalogPager baseHref={`/shops/${shop.slug}`} params={raw} page={page} hasNext={products.length === productPageSize} />
    </section>
  );
}

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}
