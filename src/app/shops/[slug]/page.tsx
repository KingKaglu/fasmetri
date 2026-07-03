import { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { CatalogPager } from "@/components/catalog-pager";
import { LastUpdatedText, ShopMark, ShopStatusBadge } from "@/components/public-ui";

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const productPageSize = 36;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const shop = (await listPublicShops()).find((item) => item.slug === slug);
  if (!shop || !shop.enabled || (shop.productCount ?? 0) <= 0) return { title: "მაღაზია" };
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
      <div className="mb-5 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <ShopMark shop={shop} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">{shop.name}</h1>
            <ShopStatusBadge shop={shop} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{(shop.productCount ?? products.length).toLocaleString()}</span> ამ მაღაზიაში ნაპოვნი პროდუქტი
            {" · "}
            <span className="font-semibold text-gray-900">{(shop.dealCount ?? 0).toLocaleString()}</span> აქტიური აქცია
            {" · "}
            ნაჩვენებია {products.length.toLocaleString()} / {(shop.productCount ?? products.length).toLocaleString()}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">
            ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს წარმოდგენილი, ამიტომ შეთავაზებების რაოდენობა შეიძლება პროდუქტის რაოდენობაზე მეტი იყოს.
          </p>
          {shop.lastScrapedAt ? <LastUpdatedText value={shop.lastScrapedAt} className="mt-1 text-xs" /> : null}
        </div>
        <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
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
