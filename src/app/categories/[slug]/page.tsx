import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PUBLIC_CATEGORY_TAXONOMY } from "@/config/categoryMapping";
import { listCategories, listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { CategoryView } from "@/lib/catalog-types";
import { ProductGrid } from "@/components/product-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
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
    <section className="shell py-7 sm:py-10">
      <div className="surface-glow mb-6 rounded-lg border p-5 shadow-sm">
        <p className="text-sm font-black text-[#0054d2]">კატეგორია</p>
        <h1 className="mt-1 text-3xl font-black sm:text-4xl">{category.nameKa}</h1>
        <p className="mt-2 leading-7 text-[#64748b]">{category.productCount ?? products.length} პროდუქტი და {category.dealCount ?? 0} ფასდაკლებული შეთავაზება.</p>
      </div>
      <MobileFilterDrawer>
        <CatalogFilters action={`/categories/${category.slug}`} resetHref={`/categories/${category.slug}`} values={filters} categories={categories} shops={shops} fixedCategory={category.slug} variant="drawer" />
      </MobileFilterDrawer>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="hidden lg:block lg:sticky lg:top-28 lg:h-fit"><CatalogFilters action={`/categories/${category.slug}`} resetHref={`/categories/${category.slug}`} values={filters} categories={categories} shops={shops} fixedCategory={category.slug} /></div>
        <div className="min-w-0">
          <ProductGrid products={products} resetHref={`/categories/${category.slug}`} emptyTitle="კატეგორიაში პროდუქტი ვერ მოიძებნა" emptyDescription="სცადე სხვა ფილტრები ან მოგვიანებით გადაამოწმე ახალი შეთავაზებები." />
          <CatalogPager baseHref={`/categories/${category.slug}`} params={raw} page={page} hasNext={products.length === productPageSize} />
        </div>
      </div>
    </section>
  );
}
