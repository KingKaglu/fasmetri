import { Metadata } from "next";
import { BadgePercent, Flame } from "lucide-react";
import { listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { CatalogPager } from "@/components/catalog-pager";
import { filterCuratedProducts } from "@/config/productCuration";

export const metadata: Metadata = {
  title: "აქციები და ფასდაკლებები",
  description: "დღის ფასდაკლებები და აქციები ქართულ ონლაინ მაღაზიებში.",
  alternates: { canonical: "/deals" },
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const val = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const productPageSize = 36;
const rankedBatchSize = 120;

export default async function DealsPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const page = Number(val(params.page)) || 1;
  const filters = {
    category: val(params.category),
    shop: val(params.shop),
    minPrice: val(params.minPrice) ? Number(val(params.minPrice)) : undefined,
    maxPrice: val(params.maxPrice) ? Number(val(params.maxPrice)) : undefined,
    minDiscount: val(params.minDiscount) ? Number(val(params.minDiscount)) : undefined,
    availability: val(params.availability),
    sort: val(params.sort) ?? "deal-priority",
    popularOnly: val(params.popularOnly) === "true",
    inStockOnly: val(params.inStockOnly) === "true",
    techOnly: val(params.techOnly) === "true",
    largeDiscountOnly: val(params.largeDiscountOnly) === "true",
    page,
  };
  const [rankedDeals, categories, shops] = await Promise.all([
    listPublicProducts({ ...filters, dealsOnly: true, pageSize: rankedBatchSize }),
    listPublicCategories(),
    listPublicShops(),
  ]);
  const products = filterCuratedProducts(rankedDeals, filters).slice(0, productPageSize);

  return (
    <section className="shell py-7 sm:py-10">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-fit">
          <CatalogFilters action="/deals" resetHref="/deals" values={filters} categories={categories} shops={shops} dealsOnly dealShortcuts />
        </aside>
        <div className="min-w-0">
          <div className="brand-gradient relative mb-6 overflow-hidden rounded-[1.6rem] border border-[#d9e4f2] py-8 text-white shadow-[0_22px_58px_rgba(0,84,210,.18)] sm:py-10">
            <div className="soft-grid absolute inset-0 opacity-20" />
            <div className="relative flex flex-col justify-between gap-5 px-5 sm:px-7 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-black text-white backdrop-blur"><Flame className="size-4 text-[#ffb000]" /> დღის საუკეთესო ფასდაკლებები</p>
                <h1 className="mt-4 text-4xl font-black">აქციები</h1>
                <p className="mt-2 leading-7 text-white/85">პირველ რიგში ჩანს ის აქციები, სადაც ფასის შედარებას რეალური აზრი აქვს: ტელეფონები, ლეპტოპები, დიდი ტექნიკა და მაღალი მოთხოვნის მოწყობილობები.</p>
                <div className="mt-4">
                  <MobileFilterDrawer badge="აქციები">
                    <CatalogFilters action="/deals" resetHref="/deals" values={filters} categories={categories} shops={shops} dealsOnly dealShortcuts variant="drawer" />
                  </MobileFilterDrawer>
                </div>
              </div>
              <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/25 bg-white/95 px-4 py-3 text-[#12203a] shadow-sm">
                <BadgePercent className="size-5 text-[#ff6800]" />
                <div><p className="text-xs font-bold text-[#64748b]">ამ გვერდზე ნაპოვნი აქცია</p><p className="text-xl font-black">{products.length}</p></div>
              </div>
            </div>
          </div>
          <ProductGrid products={products} deal resetHref="/deals" emptyTitle="აქციები ვერ მოიძებნა" emptyDescription="შეცვალე ფილტრები ან მოგვიანებით გადაამოწმე ახალი ფასდაკლებები." />
          <CatalogPager baseHref="/deals" params={params} page={page} hasNext={rankedDeals.length === rankedBatchSize} />
        </div>
      </div>
    </section>
  );
}
