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
  return shop
    ? {
        title: `${shop.name} შეთავაზებები`,
        description: `${shop.name} პროდუქტები, ფასები და აქციები ფასმეტრში.`,
        alternates: { canonical: `/shops/${shop.slug}` },
      }
    : { title: "მაღაზია" };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Params }) {
  const slug = (await params).slug;
  const raw = await searchParams;
  const page = Number(one(raw.page)) || 1;
  const [shops, products] = await Promise.all([listPublicShops(), listPublicProducts({ shop: slug, sort: "updated", page, pageSize: productPageSize })]);
  const shop = shops.find((item) => item.slug === slug);
  if (!shop) notFound();

  return (
    <section className="shell py-6 sm:py-9">
      <div className="mb-5 grid gap-4 rounded-md border border-[#e2e8f0] bg-white p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <ShopMark shop={shop} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl">{shop.name}</h1>
            <ShopStatusBadge shop={shop} />
          </div>
          <p className="mt-1 text-sm text-[#64748b]">
            <span className="font-bold text-[#0f172a]">{shop.productCount ?? products.length}</span> პროდუქტი
            {" · "}
            <span className="font-bold text-[#0f172a]">{shop.dealCount ?? 0}</span> აქცია
          </p>
          {shop.lastScrapedAt ? <LastUpdatedText value={shop.lastScrapedAt} className="mt-1 text-xs font-bold" /> : null}
        </div>
        <p className="rounded-sm border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs font-bold text-[#64748b]">
          საბოლოო ფასი მაღაზიაში გადაამოწმე
        </p>
      </div>
      <ProductGrid products={products} resetHref={`/shops/${shop.slug}`} emptyTitle="შეთავაზებები მალე გამოჩნდება" emptyDescription="ამ მაღაზიის პროდუქტები დამატებისთანავე გამოჩნდება ფასების შედარებაში." />
      <CatalogPager baseHref={`/shops/${shop.slug}`} params={raw} page={page} hasNext={products.length === productPageSize} />
    </section>
  );
}
