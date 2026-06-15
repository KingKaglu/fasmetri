import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgePercent, Flame } from "lucide-react";
import { getCatalogStats, listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { ActiveFilterChips } from "@/components/active-filter-chips";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { filterCuratedProducts } from "@/config/productCuration";
import {
  cleanSlugParam,
  finiteNumberParam,
  firstParam,
  pageNumberParam,
  PUBLIC_DEALS_RANKED_BATCH_SIZE,
  PUBLIC_LIST_PAGE_SIZE,
} from "@/lib/publicQueryParams";

type Params = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  // Paginated deal listings self-canonicalize per page (see categories/[slug]).
  const page = pageNumberParam((await searchParams).page);
  return {
    title: "აქციები და ფასდაკლებები",
    description: "დღის ფასდაკლებები და აქციები ქართულ ონლაინ მაღაზიებში.",
    alternates: { canonical: page > 1 ? `/deals?page=${page}` : "/deals" },
  };
}

export default async function DealsPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const page = pageNumberParam(params.page);
  const filters = {
    category: cleanSlugParam(params.category),
    shop: cleanSlugParam(params.shop),
    minPrice: finiteNumberParam(params.minPrice),
    maxPrice: finiteNumberParam(params.maxPrice),
    minDiscount: finiteNumberParam(params.minDiscount, 100),
    availability: cleanSlugParam(params.availability),
    sort: cleanSlugParam(params.sort) ?? "deal-priority",
    popularOnly: firstParam(params.popularOnly) === "true",
    inStockOnly: firstParam(params.inStockOnly) === "true",
    techOnly: firstParam(params.techOnly) === "true",
    largeDiscountOnly: firstParam(params.largeDiscountOnly) === "true",
    page,
  };
  const [rankedDeals, categories, shops, stats] = await Promise.all([
    listPublicProducts({ ...filters, dealsOnly: true, pageSize: PUBLIC_DEALS_RANKED_BATCH_SIZE }),
    listPublicCategories(),
    listPublicShops(),
    getCatalogStats(),
  ]);
  if (page > 1 && rankedDeals.length === 0) notFound();
  const products = filterCuratedProducts(rankedDeals, filters).slice(0, PUBLIC_LIST_PAGE_SIZE);
  const totalDeals = stats.deals;

  return (
    <>
      <section className="hero-frame shell mt-4">
        <div className="relative z-10 flex flex-col gap-3 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-300">
              <Flame className="size-3.5" /> დღის საუკეთესო ფასდაკლებები
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">აქციები</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              აქ ჩანს შეთავაზებები, სადაც ფასის შედარებას რეალური აზრი აქვს: ტელეფონები, ლეპტოპები და მოთხოვნადი ტექნიკა.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3">
            <BadgePercent className="size-5 text-blue-300" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">აქტიური აქცია</p>
              <p className="text-2xl font-bold leading-none text-white">{totalDeals.toLocaleString()}</p>
              <p className="mt-1 text-xs text-white/60">
                ამ გვერდზე ნაჩვენებია {products.length.toLocaleString()} / {totalDeals.toLocaleString()}
              </p>
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
            <ActiveFilterChips basePath="/deals" categories={categories} shops={shops} />
            <ProductGrid
              products={products}
              deal
              resetHref="/deals"
              emptyTitle="აქციები ვერ მოიძებნა"
              emptyDescription="შეცვალე ფილტრები ან მოგვიანებით გადაამოწმე ახალი ფასდაკლებები."
            />
            <CatalogPager baseHref="/deals" params={params} page={page} hasNext={rankedDeals.length === PUBLIC_DEALS_RANKED_BATCH_SIZE} />
          </div>
        </div>
      </section>
    </>
  );
}
