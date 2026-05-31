import { Metadata } from "next";
import { BadgePercent, Flame } from "lucide-react";
import { listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { filterCuratedProducts } from "@/config/productCuration";

export const metadata: Metadata = {
  title: "აქციები და ფასდაკლებები",
  description: "დღის ფასდაკლებები და აქციები ქართულ ონლაინ მაღაზიებში.",
  alternates: { canonical: "/deals" },
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const val = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const productPageSize = 36;
const rankedBatchSize = 120;

export default async function DealsPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const page = Number(val(params.page)) || 1;
  const filters = {
    category: val(params.category),
    shop: val(params.shop),
    minPrice: val(params.minPrice) ? Number(val(params.minPrice)) : undefined,
    maxPrice: val(params.maxPrice) ? Number(val(params.maxPrice)) : undefined,
    minDiscount: val(params.minDiscount) ? Number(val(params.minDiscount)) : undefined,
    availability: val(params.availability),
    sort: val(params.sort) ?? "deal-priority",
    popularOnly: val(params.popularOnly) === "true",
    inStockOnly: val(params.inStockOnly) === "true",
    techOnly: val(params.techOnly) === "true",
    largeDiscountOnly: val(params.largeDiscountOnly) === "true",
    page,
  };
  const [rankedDeals, categories, shops] = await Promise.all([
    listPublicProducts({ ...filters, dealsOnly: true, pageSize: rankedBatchSize }),
    listPublicCategories(),
    listPublicShops(),
  ]);
  const products = filterCuratedProducts(rankedDeals, filters).slice(0, productPageSize);

  return (
    <>
      <section className="hero-frame shell mt-4">
        <div className="relative z-10 flex flex-col gap-3 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow inline-flex items-center gap-1.5 text-[var(--accent)]">
              <Flame className="size-3.5" /> დღის საუკეთესო ფასდაკლებები
            </p>
            <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">აქციები</h1>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-white/68">
              აქ ჩანს შეთავაზებები, სადაც ფასის შედარებას რეალური აზრი აქვს: ტელეფონები, ლეპტოპები და მოთხოვნადი ტექნიკა.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/8 px-4 py-3">
            <BadgePercent className="size-5 text-[var(--accent)]" />
            <div>
              <p className="text-[11px] font-black uppercase text-white/58">ამ გვერდზე</p>
              <p className="text-2xl font-black leading-none text-white">{products.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-6 sm:py-8">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
            <CatalogFilters action="/deals" resetHref="/deals" values={filters} categories={categories} shops={shops} dealsOnly dealShortcuts />
          </aside>
          <div className="min-w-0">
            <div className="mb-4 lg:hidden">
              <MobileFilterDrawer badge="აქციები">
                <CatalogFilters action="/deals" resetHref="/deals" values={filters} categories={categories} shops={shops} dealsOnly dealShortcuts variant="drawer" />
              </MobileFilterDrawer>
            </div>
            <ProductGrid
              products={products}
              deal
              resetHref="/deals"
              emptyTitle="აქციები ვერ მოიძებნა"
              emptyDescription="შეცვალე ფილტრები ან მოგვიანებით გადაამოწმე ახალი ფასდაკლებები."
            />
            <CatalogPager baseHref="/deals" params={params} page={page} hasNext={rankedDeals.length === rankedBatchSize} />
          </div>
        </div>
      </section>
    </>
  );
}
