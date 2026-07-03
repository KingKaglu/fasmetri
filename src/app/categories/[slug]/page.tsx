import { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { PUBLIC_CATEGORY_TAXONOMY, isPublicCategorySlug } from "@/config/categoryMapping";
import { listCategories, listPublicCategories, listPublicProductMatches, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { CategoryView } from "@/lib/catalog-types";
import { ProductGrid } from "@/components/product-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { ActiveFilterChips } from "@/components/active-filter-chips";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { TrackView } from "@/components/track-view";
import { JsonLd } from "@/components/json-ld";
import { buildCategoryBreadcrumbJsonLd, buildCategoryItemListJsonLd } from "@/lib/structured-data";
import { isCategoryAlias, resolvePublicCategorySlug } from "@/lib/categoryNormalization";
import { cleanSlugParam, finiteNumberParam, firstParam, pageNumberParam, PUBLIC_LIST_PAGE_SIZE } from "@/lib/publicQueryParams";

type Params = Promise<Record<string, string | string[] | undefined>>;

function fallbackPublicCategory(slug: string): CategoryView | null {
  if (!isPublicCategorySlug(slug)) return null;
  const taxonomyCategory = PUBLIC_CATEGORY_TAXONOMY[slug as keyof typeof PUBLIC_CATEGORY_TAXONOMY];
  if (!taxonomyCategory) return null;

  return {
    id: slug,
    slug,
    nameKa: taxonomyCategory.nameKa,
    nameEn: taxonomyCategory.nameEn,
    productCount: 0,
    dealCount: 0,
  };
}

async function resolveCategoryForPage(slug: string) {
  const [publicCategories, allCategories] = await Promise.all([listPublicCategories(), listCategories()]);
  const category =
    publicCategories.find((item) => item.slug === slug) ??
    allCategories.find((item) => item.slug === slug) ??
    fallbackPublicCategory(slug);

  return { category, publicCategories };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Params;
}): Promise<Metadata> {
  const slug = resolvePublicCategorySlug((await params).slug);
  // Removed (non-public) categories must not be indexed.
  if (!isPublicCategorySlug(slug)) return { title: "კატეგორია ვერ მოიძებნა", robots: { index: false, follow: false } };
  const { category } = await resolveCategoryForPage(slug);
  if (!category) return { title: "კატეგორია" };

  // Paginated listings self-canonicalize per page so page 2+ is not treated
  // as duplicate content of page 1; filtered views canonicalize to the base.
  const page = pageNumberParam((await searchParams).page);
  const canonical = page > 1 ? `/categories/${category.slug}?page=${page}` : `/categories/${category.slug}`;
  return {
    title: `${category.nameKa} ფასები და აქციები`,
    description: `${category.nameKa} კატეგორიის პროდუქტების ფასები და აქციები ქართულ ონლაინ მაღაზიებში.`,
    alternates: { canonical },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Params }) {
  const routeSlug = (await params).slug;
  const slug = resolvePublicCategorySlug(routeSlug);
  if (isCategoryAlias(routeSlug)) permanentRedirect(`/categories/${slug}`);
  // Only configured public categories render directly.
  if (!isPublicCategorySlug(slug)) notFound();
  const raw = await searchParams;
  const page = pageNumberParam(raw.page);
  const q = firstParam(raw.q)?.trim().slice(0, 140) || undefined;
  const filters = {
    category: slug,
    q,
    shop: cleanSlugParam(raw.shop),
    minPrice: finiteNumberParam(raw.minPrice),
    maxPrice: finiteNumberParam(raw.maxPrice),
    minDiscount: finiteNumberParam(raw.minDiscount, 100),
    availability: cleanSlugParam(raw.availability),
    dealsOnly: firstParam(raw.dealsOnly) === "true",
    inStockOnly: firstParam(raw.inStockOnly) === "true",
    sort: cleanSlugParam(raw.sort),
    page,
  };
  const countFilters = { ...filters, page: undefined };
  const hasExtraFilters = Boolean(
    q || filters.shop || filters.minPrice != null || filters.maxPrice != null ||
    filters.minDiscount != null || filters.availability || filters.dealsOnly || filters.inStockOnly,
  );
  const [{ category, publicCategories: categories }, shops, products, matchingProducts] = await Promise.all([
    resolveCategoryForPage(slug),
    listPublicShops(),
    listPublicProducts({ ...filters, pageSize: PUBLIC_LIST_PAGE_SIZE }),
    hasExtraFilters ? listPublicProductMatches(countFilters) : Promise.resolve(null),
  ]);
  if (!category) notFound();
  if (page > 1 && products.length === 0) notFound();
  // Unfiltered totals come from the same shared summary that /categories and
  // the homepage use, so the header always matches the category card counts.
  const totalProductCount = matchingProducts ? matchingProducts.length : category.productCount ?? 0;
  const totalDealCount = matchingProducts ? matchingProducts.filter(hasActiveDeal).length : category.dealCount ?? 0;

  const breadcrumbJsonLd = buildCategoryBreadcrumbJsonLd(category);
  const itemListJsonLd = buildCategoryItemListJsonLd(category, products);

  return (
    <section className="shell py-5 sm:py-7">
      <JsonLd data={itemListJsonLd ? [breadcrumbJsonLd, itemListJsonLd] : [breadcrumbJsonLd]} />
      <TrackView event="category_view" signature={`category_view:${category.slug}`} params={{ category: category.slug }} />

      {/* Page header */}
      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="eyebrow mb-1">კატეგორია</p>
        <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">{category.nameKa}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
          <span><span className="font-semibold text-gray-900">{totalProductCount.toLocaleString()}</span> {hasExtraFilters ? "პროდუქტი ფილტრებით" : "პროდუქტი"}</span>
          <span className="text-gray-300">·</span>
          <span><span className="font-semibold text-gray-900">{totalDealCount.toLocaleString()}</span> აქტიური აქცია</span>
          <span className="text-gray-300">·</span>
          <span>ნაჩვენებია {products.length.toLocaleString()} / {totalProductCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Mobile filter trigger */}
      <div className="mb-4 lg:hidden">
        <MobileFilterDrawer>
          <CatalogFilters action={`/categories/${category.slug}`} resetHref={`/categories/${category.slug}`} values={filters} categories={categories} shops={shops} fixedCategory={category.slug} variant="drawer" />
        </MobileFilterDrawer>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden lg:sticky lg:top-[4.5rem] lg:block lg:h-fit">
          <CatalogFilters action={`/categories/${category.slug}`} resetHref={`/categories/${category.slug}`} values={filters} categories={categories} shops={shops} fixedCategory={category.slug} />
        </div>
        <div className="min-w-0">
          {/* Category search */}
          <form action={`/categories/${category.slug}`} className="mb-4 flex h-10 min-w-0 items-center overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
            <SearchIcon className="ml-3 size-3.5 shrink-0 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              maxLength={140}
              aria-label={`ძებნა კატეგორიაში ${category.nameKa}`}
              placeholder={`ძებნა ${category.nameKa}-ში...`}
              className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
            />
            {q && (
              <a href={`/categories/${category.slug}`} className="mr-1 shrink-0 px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-700">
                ✕
              </a>
            )}
            <button className="h-full shrink-0 bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]">ძებნა</button>
          </form>

          <ActiveFilterChips basePath={`/categories/${category.slug}`} categories={categories} shops={shops} fixedCategory={category.slug} />

          <ProductGrid products={products} resetHref={`/categories/${category.slug}`} emptyTitle="კატეგორიაში პროდუქტი ვერ მოიძებნა" emptyDescription="სცადე სხვა ფილტრები ან მოგვიანებით გადაამოწმე ახალი შეთავაზებები." />
          <CatalogPager baseHref={`/categories/${category.slug}`} params={raw} page={page} hasNext={products.length === PUBLIC_LIST_PAGE_SIZE} />
        </div>
      </div>
    </section>
  );
}

function hasActiveDeal(product: { offers: { discountPercent: number; oldPrice?: number | null; currentPrice: number }[] }) {
  // Same "real discount" definition as the shared catalog summary and badges.
  return product.offers.some((offer) => offer.discountPercent > 0 && offer.oldPrice != null && offer.oldPrice > offer.currentPrice);
}
