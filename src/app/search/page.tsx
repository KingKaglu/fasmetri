import Link from "next/link";
import { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import { listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { SearchBar } from "@/components/search-bar";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { TrackView } from "@/components/track-view";
import { isExcludedPublicQuery } from "@/config/productCuration";

export const metadata: Metadata = { title: "პროდუქტის ძებნა" };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const productPageSize = 36;

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const filters = readFilters(params);
  const hasSearchIntent = Boolean(filters.q || filters.category || filters.shop || filters.dealsOnly || filters.minPrice || filters.maxPrice || filters.minDiscount || filters.availability);
  const [products, categories, shops] = await Promise.all([
    hasSearchIntent ? listPublicProducts({ ...filters, pageSize: productPageSize }) : Promise.resolve([]),
    listPublicCategories(),
    listPublicShops(),
  ]);
  const headline = filters.q ? `"${filters.q}"` : "მოძებნე პროდუქტი";

  return (
    <section className="shell py-7 sm:py-9">
      {filters.q ? (
        <TrackView
          event="search"
          signature={`search:${filters.q}:${filters.category ?? ""}:${filters.page ?? 1}`}
          params={{ search_term: filters.q, category: filters.category, results_count: products.length }}
        />
      ) : null}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
          <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} />
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_10px_26px_rgba(18,19,15,0.06)]">
            <div className="min-w-0 max-w-3xl">
              <p className="eyebrow text-[var(--accent-strong)]">ფასების შედარება</p>
              <h1 className="mt-1 break-words text-3xl font-black text-[var(--brand)] sm:text-4xl">{headline}</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">
                ფილტრებით სწრაფად შეადარე ფასი, მაღაზია, ფასდაკლება და მარაგი.
              </p>
            </div>
            <Link
              href="/deals"
              className="inline-flex h-10 w-fit shrink-0 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-sm font-black text-white hover:bg-black"
            >
              <BadgePercent className="size-4 text-[var(--accent)]" />
              აქციები
            </Link>
          </div>

          <div className="mb-4 max-w-3xl">
            <SearchBar defaultValue={filters.q} />
          </div>

          <div className="mb-4 lg:hidden">
            <MobileFilterDrawer>
              <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} variant="drawer" />
            </MobileFilterDrawer>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-[0_8px_20px_rgba(18,19,15,0.05)]">
            <p className="font-black text-[var(--brand)]">
              ამ გვერდზე <span className="text-[var(--accent-strong)]">{products.length}</span> შედეგი
            </p>
            <p className="text-xs font-bold text-[var(--muted)]">ბოლო განახლება ბარათებზე ჩანს</p>
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
