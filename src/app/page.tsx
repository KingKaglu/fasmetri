import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  Laptop,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
  TrendingDown,
} from "lucide-react";
import { getCatalogStats, listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { ProductMarquee } from "@/components/product-marquee";
import { SearchBar } from "@/components/search-bar";
import { ShopCard } from "@/components/shop-card";
import {
  AvailabilityBadge,
  DiscountBadge,
  LastUpdatedText,
  PriceDisplay,
  ProductImage,
  ShopMark,
} from "@/components/public-ui";
import { compareDealPriority, filterCuratedProducts, PRIORITY_CATEGORIES } from "@/config/productCuration";

export const metadata: Metadata = {
  title: "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში",
  description: "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
  alternates: { canonical: "/" },
};
// Daily-refreshed catalog → serve the homepage from the CDN (ISR) and
// revalidate every 10 minutes instead of re-querying Supabase per request.
export const revalidate = 600;

const CATEGORIES = [
  { href: "/categories/mobiles", label: "ტელეფონები", icon: Smartphone },
  { href: "/categories/laptops", label: "ლეპტოპები",  icon: Laptop },
];

export default async function Home() {
  const [discoveryCandidates, shops, stats, categories] = await Promise.all([
    listPublicProducts({ categorySlugs: PRIORITY_CATEGORIES, sort: "priority", pageSize: 200, candidateLimit: 240 }),
    listPublicShops(),
    getCatalogStats(),
    listPublicCategories(),
  ]);
  const activeShops = shops
    .filter((shop) => (shop.productCount ?? 0) > 0)
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));
  const discounts = selectHomeDeals(
    discoveryCandidates.filter((p) => p.offers.some((o) => o.discountPercent > 0)).sort(compareDealPriority),
  );
  const trending = selectHomeDiscovery(discoveryCandidates);

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* ─── CATEGORY RAIL ──────────────────────────────── */}
      <section className="border-b border-[#e2e8f0] bg-white">
        <div className="shell">
          <div className="category-rail flex gap-1 overflow-x-auto py-2 md:gap-1.5 md:py-3">
            {CATEGORIES.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-[12px] font-bold text-[#0f172a] hover:bg-[#0f172a] hover:text-white md:text-[13px]"
              >
                <Icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HERO STRIP ─────────────────────────────────── */}
      <section className="hero-band-dark">
        <div className="shell flex flex-col gap-4 py-7 sm:py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow text-[#84cc16]">ფასმეტრი · {stats.shops} მაღაზია</p>
            <h1 className="mt-2 text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl xl:text-[2.75rem]">
              შეადარე ტელეფონებისა და ლეპტოპების ფასები საქართველოში
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              იპოვე პროდუქტი, შეადარე შეთავაზებები და გახსენი საუკეთესო მაღაზია — ერთ სივრცეში.
            </p>
            <div className="mt-4 max-w-xl">
              <SearchBar large />
            </div>
          </div>
          <div className="flex flex-wrap items-stretch gap-2">
            <Link
              href="/deals"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#84cc16] px-5 text-sm font-black text-[#1a2e05] hover:bg-[#a3e635]"
            >
              დღის აქციები
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/categories"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-white/20 bg-white/5 px-5 text-sm font-bold text-white hover:bg-white/10"
            >
              ყველა კატეგორია
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY CARDS (MVP: phones + laptops) ─────── */}
      {categories.length ? (
        <section className="shell pt-8 sm:pt-10">
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ─── DEALS ─────────────────────────────────────── */}
      <section className="shell pt-8 sm:pt-10">
        <SectionBar
          eyebrow="დღის TOP შეთავაზებები"
          title="დაიჭირე საუკეთესო ფასი"
          href="/deals"
          action="ყველა აქცია"
          dealCount={stats.deals ?? null}
        />
        {discounts.length ? (
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <FeaturedDeal product={discounts[0]} />
            </div>
            <div className="lg:col-span-8">
              <div className="product-grid-dense grid">
                {discounts.slice(1, 7).map((product, index) => (
                  <ProductCard key={product.id} product={product} deal imagePriority={index < 2} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ProductGrid
            products={discounts}
            deal
            density="compact"
            resetHref="/deals"
            emptyTitle="აქციები მალე გამოჩნდება"
            emptyDescription="ფასმეტრი პირველ რიგში მაღალმოთხოვნად პროდუქტებზე ახალ ფასდაკლებებს აჩვენებს."
          />
        )}
      </section>

      {/* ─── TRENDING ──────────────────────────────────── */}
      <section className="shell pt-10 sm:pt-12">
        <SectionBar
          eyebrow="პოპულარული"
          title="ყველაზე მოთხოვნადი პროდუქტები"
          href="/search?sort=priority"
          action="ყველა"
        />
        <div className="hidden lg:block">
          {trending.length ? (
            <ProductMarquee products={trending} />
          ) : (
            <ProductGrid products={trending} density="compact" resetHref="/search" emptyTitle="პოპულარული პროდუქტები მალე დაემატება" emptyDescription="ახალი შეთავაზებები განახლებისთანავე გამოჩნდება." />
          )}
        </div>
        <div className="lg:hidden">
          <ProductGrid products={trending} density="compact" resetHref="/search" emptyTitle="პოპულარული პროდუქტები მალე დაემატება" emptyDescription="ახალი შეთავაზებები განახლებისთანავე გამოჩნდება." />
        </div>
      </section>

      {/* ─── TRUST STRIP ───────────────────────────────── */}
      <section className="mt-12 border-y border-[#e2e8f0] bg-white">
        <div className="shell grid gap-0 divide-y divide-[#e2e8f0] py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <TrustItem
            icon={ShieldCheck}
            title="ყოველდღიური განახლება"
            description="ფასები მოწმდება ყოველდღე, რომ ხედავდე ნამდვილ ფასს."
          />
          <TrustItem
            icon={Search}
            title="ერთი ძებნა, ყველა მაღაზია"
            description={`${stats.shops ?? "—"} ქართული მაღაზია, ერთი კატალოგი.`}
          />
          <TrustItem
            icon={TrendingDown}
            title="დაზოგე რეალურად"
            description="აქცია მხოლოდ მაშინ, როცა ფასი ნამდვილად შემცირდა."
          />
        </div>
      </section>

      {/* ─── SHOPS ─────────────────────────────────────── */}
      <section className="shell pt-10 pb-12 sm:pt-12 sm:pb-16">
        <SectionBar
          eyebrow="მაღაზიები"
          title="ჩვენი წყაროები"
          href="/shops"
          action="ყველა მაღაზია"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeShops.slice(0, 3).map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </section>

    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────── */

function selectHomeDeals(products: Awaited<ReturnType<typeof listPublicProducts>>) {
  const featured = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, requireFeaturedComparison: true });
  const useful = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, inStockOnly: true });
  return uniqueProducts([...featured, ...useful]).slice(0, 8);
}

function selectHomeDiscovery(products: Awaited<ReturnType<typeof listPublicProducts>>) {
  const featured = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, requireFeaturedComparison: true });
  const discovery = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, requireDiscoveryQuality: true });
  const useful = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, inStockOnly: true });
  return uniqueProducts([...featured, ...discovery, ...useful]).slice(0, 8);
}

function uniqueProducts(products: Awaited<ReturnType<typeof listPublicProducts>>) {
  return [...new Map(products.map((p) => [p.id, p])).values()];
}

/* ── micro components ─────────────────────────────────────── */

function SectionBar({
  eyebrow,
  title,
  href,
  action = "ყველა",
  dealCount,
}: {
  eyebrow: string;
  title: string;
  href: string;
  action?: string;
  dealCount?: number | null;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#e2e8f0] pb-3">
      <div>
        <p className="eyebrow text-[#65a30d]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a] sm:text-2xl">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {dealCount != null && (
          <span className="hidden text-xs font-bold text-[#64748b] sm:inline">
            {dealCount.toLocaleString()} აქცია
          </span>
        )}
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-bold text-[#0f172a] hover:text-[#65a30d]"
        >
          {action}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 px-1 py-3 sm:px-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#ecfccb] text-[#65a30d]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-[#0f172a]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#64748b]">{description}</p>
      </div>
    </div>
  );
}

function FeaturedDeal({ product }: { product: ProductView }) {
  const offer = product.offers[0];
  if (!offer) return null;

  const discount = Math.max(...product.offers.map((item) => item.discountPercent), 0);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;
  const savings = offer.oldPrice && offer.oldPrice > offer.currentPrice ? offer.oldPrice - offer.currentPrice : 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-[#0f172a] bg-white">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-[#f1f5f9]">
        <ProductImage src={image} alt={product.name} priority tall />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-[#0f172a] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#84cc16]">
          დღის ლიდერი
        </span>
        {discount > 0 && (
          <span className="absolute right-2 top-2">
            <DiscountBadge percent={discount} />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold">
            <ShopMark shop={offer.shop} size="sm" />
            <span className="truncate text-[#0f172a]">{offer.shop.name}</span>
          </span>
          <AvailabilityBadge availability={offer.availability} />
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-bold leading-snug text-[#0f172a] hover:text-[#65a30d] sm:text-base"
        >
          {product.name}
        </Link>

        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} strong deal={discount > 0} />

        {savings > 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-[#ecfdf5] px-1.5 py-0.5 text-[11px] font-black text-[#15803d]">
            <TrendingDown className="size-3" /> დაზოგე {formatGel(savings)}
          </span>
        )}

        <div className="mt-auto flex items-center gap-1.5 border-t border-[#e2e8f0] pt-2 text-[11px] font-bold text-[#64748b]">
          <Store className="size-3 shrink-0" />
          <span className="min-w-0 truncate">
            {shopCount > 1
              ? <span className="font-black text-[#0f172a]">{shopCount} მაღაზია</span>
              : `${product.offerCount ?? product.offers.length} შეთავაზება`}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="ml-auto shrink-0" />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[#0f172a] px-3 text-sm font-bold text-white hover:bg-black"
          >
            შეადარე ფასი
          </Link>
          <a
            href={`/api/out/${offer.id}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${offer.shop.name} მაღაზიაში ნახვა`}
            title="მაღაზიაში ნახვა"
            className="grid h-10 w-10 place-items-center rounded-md border border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#84cc16] hover:bg-[#ecfccb]"
          >
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
