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
    <section className="shell py-7 sm:py-10">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-fit">
          <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} />
        </aside>
        <div className="min-w-0">
          <div className="mb-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0 max-w-3xl">
              <p className="mb-2 text-sm font-black text-[#0054d2]">ფასების შედარება</p>
              <h1 className="break-words text-3xl font-black sm:text-4xl">{headline}</h1>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">ფილტრებით სწრაფად შეადარე ფასი, მაღაზია, ფასდაკლება და მარაგი.</p>
            </div>
            <Link href="/deals" className="inline-flex h-11 w-fit items-center gap-2 rounded-md border bg-white px-4 text-sm font-black text-[#003f9f] hover:border-[#0054d2] hover:bg-[#eef5ff]">
              <BadgePercent className="size-4" />
              აქციები
            </Link>
          </div>

          <div className="mb-5 max-w-3xl"><SearchBar defaultValue={filters.q} /></div>
          <MobileFilterDrawer>
            <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} variant="drawer" />
          </MobileFilterDrawer>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white/85 px-4 py-3 text-sm">
            <p className="font-black">ამ გვერდზე {products.length} შედეგი</p>
            <p className="font-bold text-[#64748b]">ბოლო განახლება ბარათებზე ჩანს</p>
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
