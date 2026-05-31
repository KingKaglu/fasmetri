import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PUBLIC_CATEGORY_TAXONOMY, isPublicCategorySlug } from "@/config/categoryMapping";
import { listCategories, listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { CategoryView } from "@/lib/catalog-types";
import { ProductGrid } from "@/components/product-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { TrackView } from "@/components/track-view";
import { isCategoryAlias, resolvePublicCategorySlug } from "@/lib/categoryNormalization";

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const productPageSize = 36;

function fallbackPublicCategory(slug: string): CategoryView | null {
  const taxonomyCategory = PUBLIC_CATEGORY_TAXONOMY[slug as keyof typeof PUBLIC_CATEGORY_TAXONOMY];
  if (!taxonomyCategory?.public) return null;

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
        // Clean public route is the canonical (/mobiles, /laptops).
        alternates: { canonical: `/${category.slug}` },
      }
    : { title: "კატეგორია" };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Params }) {
  const routeSlug = (await params).slug;
  const slug = resolvePublicCategorySlug(routeSlug);
  if (isCategoryAlias(routeSlug)) permanentRedirect(`/categories/${slug}`);
  // Public MVP is phones + laptops only — every other category 404s.
  if (!isPublicCategorySlug(slug)) notFound();
  const raw = await searchParams;
  const page = Number(one(raw.page)) || 1;
  const filters = {
    category: slug,
    shop: one(raw.shop),
    minPrice: one(raw.minPrice) ? Number(one(raw.minPrice)) : undefined,
    maxPrice: one(raw.maxPrice) ? Number(one(raw.maxPrice)) : undefined,
    minDiscount: one(raw.minDiscount) ? Number(one(raw.minDiscount)) : undefined,
    availability: one(raw.availability),
    dealsOnly: one(raw.dealsOnly) === "true",
    sort: one(raw.sort),
    page,
  };
  const [{ category, publicCategories: categories }, shops, products] = await Promise.all([
    resolveCategoryForPage(slug),
    listPublicShops(),
    listPublicProducts({ ...filters, pageSize: productPageSize }),
  ]);
  if (!category) notFound();

  return (
    <section className="shell py-6 sm:py-9">
      <TrackView event="category_view" signature={`category_view:${category.slug}`} params={{ category: category.slug }} />
      <div className="mb-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_10px_26px_rgba(18,19,15,0.06)]">
        <p className="eyebrow text-[var(--accent-strong)]">კატეგორია</p>
        <h1 className="mt-1 text-3xl font-black text-[var(--brand)] sm:text-4xl">{category.nameKa}</h1>
        <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">
          <span className="font-black text-[var(--brand)]">{category.productCount ?? products.length}</span> პროდუქტი
          {" · "}
          <span className="font-black text-[var(--brand)]">{category.dealCount ?? 0}</span> ფასდაკლება
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
          <ProductGrid products={products} resetHref={`/categories/${category.slug}`} emptyTitle="კატეგორიაში პროდუქტი ვერ მოიძებნა" emptyDescription="სცადე სხვა ფილტრები ან მოგვიანებით გადაამოწმე ახალი შეთავაზებები." />
          <CatalogPager baseHref={`/categories/${category.slug}`} params={raw} page={page} hasNext={products.length === productPageSize} />
        </div>
      </div>
    </section>
  );
}
