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
    <section className="shell py-7 sm:py-10">
      <div className="surface-glow surface-shadow mb-6 grid gap-4 rounded-lg border p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <ShopMark shop={shop} />
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black">{shop.name}</h1><ShopStatusBadge shop={shop} /></div>
          <p className="mt-2 text-[#64748b]">{shop.productCount ?? products.length} პროდუქტი და {shop.dealCount ?? 0} მიმდინარე აქცია შედარებისთვის.</p>
          {shop.lastScrapedAt ? <LastUpdatedText value={shop.lastScrapedAt} className="mt-2 text-sm font-bold" /> : null}
        </div>
        <p className="rounded-md border bg-white px-3 py-2 text-sm font-bold text-[#64748b]">საბოლოო ფასი მაღაზიაში გადაამოწმე</p>
      </div>
      <ProductGrid products={products} resetHref={`/shops/${shop.slug}`} emptyTitle="შეთავაზებები მალე გამოჩნდება" emptyDescription="ამ მაღაზიის პროდუქტები დამატებისთანავე გამოჩნდება ფასების შედარებაში." />
      <CatalogPager baseHref={`/shops/${shop.slug}`} params={raw} page={page} hasNext={products.length === productPageSize} />
    </section>
  );
}
