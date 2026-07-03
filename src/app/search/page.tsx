import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgePercent, Laptop, Search, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { SearchBar } from "@/components/search-bar";
import { CatalogFilters } from "@/components/catalog-filters";
import { ActiveFilterChips } from "@/components/active-filter-chips";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { TrackView } from "@/components/track-view";
import { isExcludedPublicQuery } from "@/config/productCuration";
import {
  cleanSearchQuery,
  cleanSlugParam,
  finiteNumberParam,
  firstParam,
  pageNumberParam,
  PUBLIC_LIST_PAGE_SIZE,
} from "@/lib/publicQueryParams";

export const metadata: Metadata = {
  title: "პროდუქტის ძებნა",
  description: "მოძებნე ტელეფონები და ლეპტოპები და შეადარე ფასები ქართულ ონლაინ მაღაზიებში.",
  alternates: { canonical: "/search" },
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const suggestedSearches = ["iPhone", "აიფონი", "Samsung", "Xiaomi", "MacBook", "ლეპტოპი", "ტელეფონი", "128GB", "12/256"];
const popularSearches = ["iphone 15", "Samsung Galaxy", "Xiaomi 128GB", "MacBook Air", "ლეპტოპი 16GB", "აიფონი 128GB"];

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const filters = readFilters(params);
  const hasSearchIntent = Boolean(filters.q || filters.category || filters.shop || filters.dealsOnly || filters.inStockOnly || filters.minPrice || filters.maxPrice || filters.minDiscount || filters.availability);
  const [products, discoveryProducts, latestDeals, categories, shops] = await Promise.all([
    hasSearchIntent ? listPublicProducts({ ...filters, pageSize: PUBLIC_LIST_PAGE_SIZE }) : Promise.resolve([]),
    hasSearchIntent ? Promise.resolve([]) : listPublicProducts({ sort: "priority", pageSize: 8 }),
    hasSearchIntent ? Promise.resolve([]) : listPublicProducts({ dealsOnly: true, sort: "deal-priority", pageSize: 4 }),
    listPublicCategories(),
    listPublicShops(),
  ]);
  if (hasSearchIntent && (filters.page ?? 1) > 1 && products.length === 0) notFound();
  const headline = filters.q ? `"${filters.q}"` : "მოძებნე პროდუქტი";

  return (
    <section className="shell py-5 sm:py-7">
      {filters.q ? (
        <TrackView
          event="search"
          signature={`search:${filters.q}:${filters.category ?? ""}:${filters.page ?? 1}`}
          params={{ search_term: filters.q, category: filters.category, results_count: products.length }}
        />
      ) : null}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-[4.5rem] lg:block lg:h-fit">
          <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} />
        </aside>
        <div className="min-w-0">
          {/* Page header */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-1">ძებნა</p>
                <h1 className="font-display break-words text-xl font-bold text-gray-900 sm:text-2xl">{headline}</h1>
              </div>
              <Link href="/deals" className="flex shrink-0 items-center gap-1.5 rounded-md bg-zinc-950 border border-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black">
                <BadgePercent className="size-3.5" />
                აქციები
              </Link>
            </div>
          </div>

          {/* Search input */}
          <div className="mb-4">
            <SearchBar defaultValue={filters.q} />
          </div>

          {/* Mobile filter trigger */}
          <div className="mb-4 lg:hidden">
            <MobileFilterDrawer>
              <CatalogFilters action="/search" resetHref="/search" values={filters} categories={categories} shops={shops} variant="drawer" />
            </MobileFilterDrawer>
          </div>

          {/* Results count */}
          {hasSearchIntent && products.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm">
              <span className="font-semibold text-gray-900">{products.length.toLocaleString()} პროდუქტი</span>
              <span className="text-gray-400 text-xs">· ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს</span>
            </div>
          )}

          {hasSearchIntent ? (
            <>
              <ActiveFilterChips basePath="/search" categories={categories} shops={shops} />
              {products.length ? (
                <ProductGrid products={products} resetHref="/search" />
              ) : (
                <FailedSearchState />
              )}
              <CatalogPager baseHref="/search" params={params} page={filters.page} hasNext={products.length === PUBLIC_LIST_PAGE_SIZE} />
            </>
          ) : (
            <SearchDiscovery latestDeals={latestDeals} products={discoveryProducts} />
          )}
        </div>
      </div>
    </section>
  );
}

function readFilters(params: Record<string, string | string[] | undefined>) {
  const q = cleanSearchQuery(params.q);
  return {
    q: isExcludedPublicQuery(q) ? undefined : q,
    category: cleanSlugParam(params.category),
    shop: cleanSlugParam(params.shop),
    minPrice: finiteNumberParam(params.minPrice),
    maxPrice: finiteNumberParam(params.maxPrice),
    minDiscount: finiteNumberParam(params.minDiscount, 100),
    availability: cleanSlugParam(params.availability),
    dealsOnly: firstParam(params.dealsOnly) === "true",
    inStockOnly: firstParam(params.inStockOnly) === "true",
    sort: cleanSlugParam(params.sort),
    page: pageNumberParam(params.page),
  };
}

function SearchDiscovery({
  latestDeals,
  products,
}: {
  latestDeals: Awaited<ReturnType<typeof listPublicProducts>>;
  products: Awaited<ReturnType<typeof listPublicProducts>>;
}) {
  return (
    <div className="grid gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          <Sparkles className="size-3.5" /> პოპულარული ძიებები
        </div>
        <KeywordLinks keywords={popularSearches} />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">შემოთავაზებული</p>
        <KeywordLinks keywords={suggestedSearches} compact />
        <div className="mt-4 grid gap-2 min-[380px]:grid-cols-2">
          <CategoryShortcut href="/categories/mobiles" icon={Smartphone} label="ტელეფონები" />
          <CategoryShortcut href="/categories/laptops" icon={Laptop} label="ლეპტოპები" />
        </div>
      </div>

      {latestDeals.length > 0 && (
        <section>
          <SectionTitle title="ბოლო აქციები" href="/deals" />
          <ProductGrid products={latestDeals} deal density="compact" />
        </section>
      )}

      {products.length > 0 && (
        <section>
          <SectionTitle title="პოპულარული პროდუქტები" href="/search?sort=priority" />
          <ProductGrid products={products} density="compact" priorityImages={0} />
        </section>
      )}
    </div>
  );
}

function FailedSearchState() {
  return (
    <div className="grid min-h-60 place-items-center rounded-lg border border-gray-200 bg-white px-4 py-10 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
          <Search className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-gray-900">ვერ მოიძებნა შედეგი</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-gray-500">
          სცადე სხვა სახელი, ბრენდი ან მეხსიერების მოცულობა.
        </p>
        <KeywordLinks keywords={suggestedSearches} compact />
        <div className="mx-auto mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/search" className="flex h-9 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]">
            ფილტრების გასუფთავება
          </Link>
          <CategoryShortcut href="/categories/mobiles" icon={Smartphone} label="ტელეფონები" />
          <CategoryShortcut href="/categories/laptops" icon={Laptop} label="ლეპტოპები" />
        </div>
      </div>
    </div>
  );
}

function KeywordLinks({ keywords, compact = false }: { keywords: string[]; compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-3" : "mt-4"} flex flex-wrap gap-1.5`}>
      {keywords.map((keyword) => (
        <Link
          key={keyword}
          href={`/search?q=${encodeURIComponent(keyword)}`}
          className="inline-flex h-8 items-center rounded-full border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
        >
          {keyword}
        </Link>
      ))}
    </div>
  );
}

function CategoryShortcut({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex h-10 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
      <Icon className="size-4 text-gray-400" />
      {label}
    </Link>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <Link href={href} className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
        ყველა →
      </Link>
    </div>
  );
}
