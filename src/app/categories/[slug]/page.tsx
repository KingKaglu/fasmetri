import { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { PUBLIC_CATEGORY_TAXONOMY, isPublicCategorySlug } from "@/config/categoryMapping";
import { listCategories, listPublicCategories, listPublicProductMatches, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { CategoryView } from "@/lib/catalog-types";
import { ProductGrid } from "@/components/product-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { TrackView } from "@/components/track-view";
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = resolvePublicCategorySlug((await params).slug);
  // Removed (non-public) categories must not be indexed.
  if (!isPublicCategorySlug(slug)) return { title: "კატეგორია ვერ მოიძებნა", robots: { index: false, follow: false } };
  const { category } = await resolveCategoryForPage(slug);
  return category
    ? {
        title: `${category.nameKa} ფასები და აქციები`,
        description: `${category.nameKa} კატეგორიის პროდუქტების ფასები და აქციები ქართულ ონლაინ მაღაზიებში.`,
        alternates: { canonical: `/categories/${category.slug}` },
      }
    : { title: "კატეგორია" };
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
    sort: cleanSlugParam(raw.sort),
    page,
  };
  const countFilters = { ...filters, page: undefined };
  const [{ category, publicCategories: categories }, shops, products, matchingProducts] = await Promise.all([
    resolveCategoryForPage(slug),
    listPublicShops(),
    listPublicProducts({ ...filters, pageSize: PUBLIC_LIST_PAGE_SIZE }),
    listPublicProductMatches(countFilters),
  ]);
  if (!category) notFound();
  if (page > 1 && products.length === 0) notFound();
  const totalProductCount = matchingProducts.length;
  const totalDealCount = matchingProducts.filter(hasActiveDeal).length;

  return (
    <section className="shell py-6 sm:py-9">
      <TrackView event="category_view" signature={`category_view:${category.slug}`} params={{ category: category.slug }} />
      <div className="mb-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_10px_26px_rgba(18,19,15,0.06)]">
        <p className="eyebrow text-[var(--accent-strong)]">კატეგორია</p>
        <h1 className="mt-1 text-3xl font-black text-[var(--brand)] sm:text-4xl">{category.nameKa}</h1>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold leading-6 text-[var(--muted)]">
          <span>
            სულ <span className="font-black text-[var(--brand)]">{totalProductCount.toLocaleString()}</span> უნიკალური პროდუქტი
          </span>
          <span>
            ამ გვერდზე ნაჩვენებია <span className="font-black text-[var(--brand)]">{products.length.toLocaleString()}</span> პროდუქტი
          </span>
          <span>
            სულ <span className="font-black text-[var(--brand)]">{totalDealCount.toLocaleString()}</span> აქტიური აქცია
          </span>
        </p>
        <p className="mt-1.5 max-w-2xl text-xs font-bold leading-5 text-[var(--muted)]">
          ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს წარმოდგენილი, ამიტომ შეთავაზებების რაოდენობა შეიძლება პროდუქტის რაოდენობაზე მეტი იყოს.
        </p>
      </div>
      <div className="mb-4 lg:hidden">
        <MobileFilterDrawer>
          <CatalogFilters action={`/categories/${category.slug}`} resetHref={`/categories/${category.slug}`} values={filters} categories={categories} shops={shops} fixedCategory={category.slug} variant="drawer" />
        </MobileFilterDrawer>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
          <CatalogFilters action={`/categories/${category.slug}`} resetHref={`/categories/${category.slug}`} values={filters} categories={categories} shops={shops} fixedCategory={category.slug} />
        </div>
        <div className="min-w-0">
          <form action={`/categories/${category.slug}`} className="mb-4 flex h-11 min-w-0 items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_8px_20px_rgba(18,19,15,0.06)]">
            <SearchIcon className="ml-3.5 size-4 shrink-0 text-[var(--muted)]" />
            <input
              name="q"
              defaultValue={q}
              maxLength={140}
              aria-label={`ძებნა კატეგორიაში ${category.nameKa}`}
              placeholder={`მოძებნე ${category.nameKa}-ში...`}
              className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm font-bold text-[var(--brand)] outline-none placeholder:text-[var(--muted)]"
            />
            {q ? (
              <a href={`/categories/${category.slug}`} className="mr-1 shrink-0 rounded-lg px-2 py-1 text-xs font-black text-[var(--muted)] hover:text-[var(--brand)]">
                გასუფთავება
              </a>
            ) : null}
            <button className="h-full shrink-0 bg-[var(--brand)] px-4 text-sm font-black text-white hover:bg-black">ძებნა</button>
          </form>
          <ProductGrid products={products} resetHref={`/categories/${category.slug}`} emptyTitle="კატეგორიაში პროდუქტი ვერ მოიძებნა" emptyDescription="სცადე სხვა ფილტრები ან მოგვიანებით გადაამოწმე ახალი შეთავაზებები." />
          <CatalogPager baseHref={`/categories/${category.slug}`} params={raw} page={page} hasNext={products.length === PUBLIC_LIST_PAGE_SIZE} />
        </div>
      </div>
    </section>
  );
}

function hasActiveDeal(product: { offers: { discountPercent: number }[] }) {
  return product.offers.some((offer) => offer.discountPercent > 0);
}
