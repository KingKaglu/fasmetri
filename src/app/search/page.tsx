import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgePercent, Laptop, Search, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { SearchBar } from "@/components/search-bar";
import { CatalogFilters } from "@/components/catalog-filters";
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

export const metadata: Metadata = { title: "პროდუქტის ძებნა" };

type Params = Promise<Record<string, string | string[] | undefined>>;
const suggestedSearches = ["iPhone", "აიფონი", "Samsung", "Xiaomi", "MacBook", "ლეპტოპი", "ტელეფონი", "128GB", "12/256"];
const popularSearches = ["iphone 15", "Samsung Galaxy", "Xiaomi 128GB", "MacBook Air", "ლეპტოპი 16GB", "აიფონი 128GB"];

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const filters = readFilters(params);
  const hasSearchIntent = Boolean(filters.q || filters.category || filters.shop || filters.dealsOnly || filters.minPrice || filters.maxPrice || filters.minDiscount || filters.availability);
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

          {hasSearchIntent ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-[0_8px_20px_rgba(18,19,15,0.05)]">
              <p className="font-black text-[var(--brand)]">
                ამ გვერდზე ნაჩვენებია <span className="text-[var(--accent-strong)]">{products.length.toLocaleString()}</span> პროდუქტი
              </p>
              <p className="text-xs font-bold text-[var(--muted)]">ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს წარმოდგენილი.</p>
            </div>
          ) : null}

          {hasSearchIntent ? (
            <>
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
    <div className="grid gap-5">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_20px_rgba(18,19,15,0.05)] sm:p-5">
        <p className="eyebrow inline-flex items-center gap-1.5 text-[var(--accent-strong)]">
          <Sparkles className="size-3.5" /> დაიწყე ძიება
        </p>
        <h2 className="mt-1 text-xl font-black text-[var(--brand)]">პოპულარული ძიებები</h2>
        <KeywordLinks keywords={popularSearches} />
        <h3 className="mt-5 text-sm font-black text-[var(--brand)]">შემოთავაზებული სიტყვები</h3>
        <KeywordLinks keywords={suggestedSearches} compact />
        <div className="mt-5 grid gap-2 min-[380px]:grid-cols-2">
          <CategoryShortcut href="/categories/mobiles" icon={Smartphone} label="ტელეფონები" />
          <CategoryShortcut href="/categories/laptops" icon={Laptop} label="ლეპტოპები" />
        </div>
      </div>

      {latestDeals.length ? (
        <section>
          <SectionTitle title="ბოლო აქტიური აქციები" href="/deals" />
          <ProductGrid products={latestDeals} deal density="compact" />
        </section>
      ) : null}

      {products.length ? (
        <section>
          <SectionTitle title="პოპულარული პროდუქტები" href="/search?sort=priority" />
          <ProductGrid products={products} density="compact" />
        </section>
      ) : null}
    </div>
  );
}

function FailedSearchState() {
  return (
    <div className="surface-flat px-4 py-8 text-center sm:px-6">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]">
        <Search className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-black text-[var(--brand)]">ვერ მოიძებნა ზუსტი შედეგი</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-[var(--muted)]">
        სცადე სხვა სახელი, ბრენდი ან მეხსიერების მოცულობა.
      </p>
      <KeywordLinks keywords={suggestedSearches} compact />
      <div className="mx-auto mt-5 grid max-w-md gap-2 min-[380px]:grid-cols-3">
        <Link href="/search" className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-black text-white hover:bg-black">
          ფილტრების გასუფთავება
        </Link>
        <CategoryShortcut href="/categories/mobiles" icon={Smartphone} label="ტელეფონები" />
        <CategoryShortcut href="/categories/laptops" icon={Laptop} label="ლეპტოპები" />
      </div>
    </div>
  );
}

function KeywordLinks({ keywords, compact = false }: { keywords: string[]; compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-3" : "mt-4"} flex flex-wrap gap-2`}>
      {keywords.map((keyword) => (
        <Link
          key={keyword}
          href={`/search?q=${encodeURIComponent(keyword)}`}
          className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          {keyword}
        </Link>
      ))}
    </div>
  );
}

function CategoryShortcut({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-black text-[var(--brand)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black text-[var(--brand)]">{title}</h2>
      <Link href={href} className="text-xs font-black text-[var(--accent-strong)] hover:text-[var(--brand)]">
        ნახვა
      </Link>
    </div>
  );
}
