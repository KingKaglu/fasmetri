import Link from "next/link";
import { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import { listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { SearchBar } from "@/components/search-bar";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { isExcludedPublicQuery } from "@/config/productCuration";

export const metadata: Metadata = { title: "პროდუქტის ძიება" };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const productPageSize = 36;

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const filters = readFilters(params);
  const hasSearchIntent = Boolean(filters.q || filters.category || filters.shop || filters.dealsOnly || filters.minPrice || filters.maxPrice || filters.minDiscount || filters.availability);
  const [products, categories, shops] = await Promise.all([hasSearchIntent ? listPublicProducts({ ...filters, pageSize: productPageSize }) : Promise.resolve([]), listPublicCategories(), listPublicShops()]);
  const headline = filters.q ? `"${filters.q}"` : "მოძებნე პროდუქტი";

  return (
    <section className="shell py-7 sm:py-9">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
          <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} />
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[#e2e8f0] pb-4">
            <div className="min-w-0 max-w-3xl">
              <p className="eyebrow text-[#65a30d]">ფასების შედარება</p>
              <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl">{headline}</h1>
              <p className="mt-1.5 text-sm leading-6 text-[#64748b]">ფილტრებით სწრაფად შეადარე ფასი, მაღაზია, ფასდაკლება და მარაგი.</p>
            </div>
            <Link
              href="/deals"
              className="inline-flex h-10 w-fit shrink-0 items-center gap-1.5 rounded-md border border-[#e2e8f0] bg-white px-4 text-sm font-bold text-[#0f172a] hover:border-[#0f172a]"
            >
              <BadgePercent className="size-4 text-[#65a30d]" />
              აქციები
            </Link>
          </div>

          <div className="mb-4 max-w-3xl"><SearchBar defaultValue={filters.q} /></div>

          <div className="mb-4 lg:hidden">
            <MobileFilterDrawer>
              <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} variant="drawer" />
            </MobileFilterDrawer>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm">
            <p className="font-bold text-[#0f172a]">ამ გვერდზე <span className="font-black text-[#65a30d]">{products.length}</span> შედეგი</p>
            <p className="text-xs font-semibold text-[#64748b]">ბოლო განახლება ბარათებზე ჩანს</p>
          </div>
          {hasSearchIntent ? (
            <>
              <ProductGrid
                products={products}
                resetHref="/search"
                emptyTitle="პროდუქტი ვერ მოიძებნა"
                emptyDescription="სცადე სხვა საძიებო სიტყვა ან შეცვალე ფილტრები."
              />
              <CatalogPager baseHref="/search" params={params} page={filters.page} hasNext={products.length === productPageSize} />
            </>
          ) : (
            <ProductGrid
              products={[]}
              resetHref="/categories"
              emptyTitle="მოძებნე პროდუქტი"
              emptyDescription="ჩაწერე პროდუქტის სახელი ან აირჩიე კატეგორია, რომ ფასები შეადარო."
              emptyAction="კატეგორიების ნახვა"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function readFilters(params: Record<string, string | string[] | undefined>) {
  const q = one(params.q)?.trim().slice(0, 140);
  return {
    q: isExcludedPublicQuery(q) ? undefined : q,
    category: one(params.category),
    shop: one(params.shop),
    minPrice: one(params.minPrice) ? Number(one(params.minPrice)) : undefined,
    maxPrice: one(params.maxPrice) ? Number(one(params.maxPrice)) : undefined,
    minDiscount: one(params.minDiscount) ? Number(one(params.minDiscount)) : undefined,
    availability: one(params.availability),
    dealsOnly: one(params.dealsOnly) === "true",
    sort: one(params.sort),
    page: one(params.page) ? Number(one(params.page)) : undefined,
  };
}
