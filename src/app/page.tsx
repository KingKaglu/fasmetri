import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  Flame,
  Laptop,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
  TrendingDown,
} from "lucide-react";
import { getCatalogStats, listPublicCategories, listPublicProducts, listPublicShops, listRecentPriceChanges, RecentPriceChange } from "@/lib/catalog";
import { getPriceIndex, PriceIndex } from "@/lib/priceIndex";
import { ProductView } from "@/lib/catalog-types";
import { formatGel, formatRelativeTime } from "@/lib/format";
import { CategoryCard } from "@/components/category-card";
import { RecentlyViewedStrip } from "@/components/recently-viewed";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { SearchBar } from "@/components/search-bar";
import { ShopCard } from "@/components/shop-card";
import { ShopClickLink } from "@/components/shop-click-link";
import {
  AvailabilityBadge,
  DiscountBadge,
  LastUpdatedText,
  PriceDisplay,
  ProductImage,
  ShopMark,
  realDiscountPercent,
} from "@/components/public-ui";
import { compareDealPriority, compareProductPriority, filterCuratedProducts, PRIORITY_CATEGORIES } from "@/config/productCuration";

export const metadata: Metadata = {
  title: "ფასმეტრი — შეადარე ფასები ქართულ ონლაინ მაღაზიებში",
  description:
    "შეადარე მობილურებისა და ლეპტოპების ფასები ქართულ ონლაინ მაღაზიებში. იპოვე საუკეთესო შეთავაზება და ყიდვამდე გადაამოწმე ფასი ოფიციალურ გვერდზე.",
  alternates: { canonical: "/" },
};

export const revalidate = 600;

const heroTabs = [
  { href: "/search", label: "ყველა", active: true },
  { href: "/categories/mobiles", label: "ტელეფონები", active: false },
  { href: "/categories/laptops", label: "ლეპტოპები", active: false },
  { href: "/categories/gaming", label: "კონსოლები", active: false },
  { href: "/deals", label: "აქციები", active: false },
];

// Popular brands strip (retail handoff) — link to filtered search.
const POPULAR_BRANDS = ["Apple", "Samsung", "Xiaomi", "HUAWEI", "ASUS", "Lenovo", "Sony", "HP"];

type HomeProduct = Awaited<ReturnType<typeof listPublicProducts>>[number];

export default async function Home() {
  // One pool per public category so the front page always mixes phones and
  // laptops instead of whatever a single global sort happens to surface.
  const [categoryDeals, categoryPopular, shops, stats, categories, priceChanges, gamingPool, priceIndex] = await Promise.all([
    Promise.all(
      PRIORITY_CATEGORIES.map((category) =>
        listPublicProducts({ category, dealsOnly: true, sort: "discount", pageSize: 60 }),
      ),
    ),
    Promise.all(
      PRIORITY_CATEGORIES.map((category) => listPublicProducts({ category, sort: "priority", pageSize: 80 })),
    ),
    listPublicShops(),
    getCatalogStats(),
    listPublicCategories(),
    listRecentPriceChanges(),
    listPublicProducts({ category: "gaming", sort: "priority", pageSize: 12 }),
    getPriceIndex(),
  ]);
  // Lead the PS5/console row with the products compared across the most shops
  // (the PlayStation 5 console itself), so the comparison is the first thing seen.
  const gamingProducts = [...gamingPool].sort(
    (left, right) => uniqueShopCount(right) - uniqueShopCount(left) || compareProductPriority(left, right),
  );
  // listPublicShops already returns only publicly active shops (same list as
  // /shops and the filter dropdowns), sorted by product count.
  const activeShops = shops;
  const discounts = selectHomeDeals(categoryDeals);
  const promotedKeys = new Set(discounts.flatMap(homepageDedupKeys));
  const trending = selectFrequentlyCompared(categoryPopular, promotedKeys);
  const heroProduct = discounts[0] ?? trending[0];
  // Mobile-first discovery: a clickable top-deals strip in the hero so phone
  // users can tap a product within seconds without using the search bar.
  const heroDeals = (discounts.length ? discounts : trending).slice(0, 8);

  return (
    <div className="min-h-screen">
      {/* Hero — broadsheet front page: full-bleed ink band */}
      <section className="hero-frame overflow-hidden !rounded-none">
        <div className="shell relative z-10">
          <div className="grid gap-6 py-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:gap-12 lg:py-12">
            {/* Left: copy + search */}
            <div className="flex min-w-0 flex-col justify-center">
              {/* Kicker — dateline */}
              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/20 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                <span className="text-white">ფასმეტრი</span>
                <span aria-hidden className="text-white/30">/</span>
                <span>ფასების ინდექსი ქართულ მაღაზიებში</span>
                <span aria-hidden className="hidden text-white/30 sm:inline">/</span>
                <span className="hidden sm:inline" suppressHydrationWarning>{georgianDateline()}</span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
                შეადარე <span className="hero-highlight">ფასები</span> ქართულ მაღაზიებში
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
                ფასმეტრი აერთიანებს ქართულ ონლაინ მაღაზიებს ერთ კატალოგში — სწრაფად ნახე სად არის საუკეთესო ფასი.
              </p>

              {/* Category index — underlined newspaper tabs */}
              <div className="mt-6 flex min-w-0 flex-wrap gap-x-5 gap-y-2">
                {heroTabs.map(({ href, label, active }) => (
                  <Link
                    key={href}
                    href={href}
                    className={
                      active
                        ? "shrink-0 border-b-2 border-white pb-1 text-[13px] font-bold uppercase tracking-[0.08em] text-white"
                        : "shrink-0 border-b-2 border-transparent pb-1 text-[13px] font-medium uppercase tracking-[0.08em] text-white/60 hover:border-white/40 hover:text-white"
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 max-w-xl">
                <SearchBar large />
              </div>

              {/* Stats — ruled columns, financial-paper style */}
              <div className="mt-8 flex max-w-xl gap-6 sm:gap-10">
                <HeroStat label="მაღაზია" value={stats.shops} />
                <HeroStat label="პროდუქტი" value={stats.products} />
                <HeroStat label="აქტიური აქცია" value={stats.deals} />
              </div>

              {/* Mobile-only top-deals strip — instant tappable discovery without search */}
              {heroDeals.length > 0 && (
                <div className="mt-6 lg:hidden">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                      <Flame className="size-3.5" />
                      დღის საუკეთესო ფასები
                    </span>
                    <Link href="/deals" className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-white/80 hover:text-white">
                      ყველა
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                  <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
                    {heroDeals.map((product) => (
                      <HeroMobileDealCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: promo cards (retail handoff) */}
            <div className="hidden lg:flex lg:w-[320px] xl:w-[340px] lg:flex-col lg:gap-4">
              <HeroPromo
                href="/categories/mobiles"
                badge="ბესტსელერი"
                badgeTone="accent"
                title="iPhone 16 სერია"
                subtitle="შეადარე 3 მაღაზიის ფასი"
                icon={<Smartphone className="size-7 text-white" />}
              />
              <HeroPromo
                href="/categories/laptops"
                badge="-15%"
                badgeTone="save"
                title="გეიმინგ ლეპტოპები"
                subtitle="RTX 5060 — დან"
                icon={<Laptop className="size-7 text-white" />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-gray-200 bg-white">
        <div className="shell grid divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <TrustItem icon={ShieldCheck} title="ფასები რეგულარულად ახლდება" description="კატალოგი ყოველდღიურად ამოწმებს ფასს, მარაგს და ფასდაკლებას." />
          <TrustItem icon={Store} title="ერთი ძებნა, ბევრი მაღაზია" description={`${stats.shops ?? "რამდენიმე"} ქართული მაღაზია ერთ შედარებად კატალოგში.`} />
          <TrustItem icon={TrendingDown} title="საუკეთესო ფასი ბარათზე" description="ყველაზე დაბალი ფასი და ფასდაკლება ერთი მზერით ჩანს." />
        </div>
      </section>

      {/* Recently viewed — renders only when the visitor has history */}
      <RecentlyViewedStrip />

      {/* Categories */}
      {categories.length > 0 && (
        <section className="shell pt-8 pb-4">
          <SectionBar eyebrow="კატეგორიები" title="პოპულარული კატეგორიები" href="/categories" action="ყველა კატეგორია" />
          <div className="grid gap-3">
            {categories.slice(0, 2).map((category) => (
              <CategoryCard key={category.id} category={category} layout="row" />
            ))}
          </div>
        </section>
      )}

      {/* Deals */}
      <section className="section-mist mt-8 border-y border-[var(--line)]">
        <div className="shell pt-8 pb-8">
        <SectionBar eyebrow="ფასდაკლებები" title="დღის საუკეთესო ფასები" href="/deals" action="ყველა აქცია" dealCount={stats.deals ?? null} />
        {discounts.length ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <FeaturedDeal product={discounts[0]} />
            </div>
            <div className="min-w-0 lg:col-span-8">
              <div className="product-grid-dense product-rail-mobile grid min-w-0">
                {discounts.slice(1, 6).map((product, index) => (
                  <ProductCard key={product.id} product={product} deal imagePriority={index < 2} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ProductGrid products={discounts} deal density="compact" resetHref="/deals" emptyTitle="აქციები მალე გამოჩნდება" emptyDescription="ფასმეტრი ახალი ფასდაკლებების დამატებისთანავე აჩვენებს საუკეთესო შეთავაზებებს." />
        )}
        </div>
      </section>

      {/* Consoles / PlayStation 5 — cross-shop comparison (full ink band) */}
      {gamingProducts.length > 0 && (
        <section className="section-ink section-ink-grain mt-8">
          <div className="shell pt-9 pb-9">
          <SectionBar
            eyebrow="კონსოლები"
            title="PlayStation 5 — შეადარე მაღაზიებში"
            href="/categories/gaming"
            action="ყველა კონსოლი"
          />
          <ProductGrid
            products={gamingProducts}
            density="compact"
            mobileRail
            resetHref="/categories/gaming"
            priorityImages={0}
            emptyTitle="კონსოლები მალე დაემატება"
            emptyDescription="PlayStation 5 და აქსესუარები მაღაზიების მიხედვით."
          />
          </div>
        </section>
      )}

      {/* Recently updated prices + market index ticker */}
      {priceChanges.length > 0 && (
        <section className="shell pt-8 pb-4">
          <SectionBar eyebrow="ფასების მონიტორინგი" title="ახლახანს განახლებული ფასები" href="/price-index" action="ფასების ინდექსი" />
          <IndexTicker index={priceIndex} />
          <div className="wire-table overflow-hidden">
            <ul>
              {priceChanges.map((change) => (
                <PriceChangeRow key={change.offerId} change={change} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Trending */}
      <section className="section-mist mt-8 border-y border-[var(--line)]">
        <div className="shell pt-8 pb-8">
        <SectionBar eyebrow="ხშირად შედარებული" title="პოპულარული პროდუქტები" href="/search?sort=priority" action="ყველა" />
        <ProductGrid products={trending} density="compact" mobileRail resetHref="/search" priorityImages={0} emptyTitle="პოპულარული პროდუქტები მალე დაემატება" emptyDescription="ახალი შეთავაზებები განახლებისთანავე გამოჩნდება." />
        </div>
      </section>

      {/* Popular brands (retail handoff) — hatched band */}
      <section className="section-hatch mt-8 border-b border-[var(--line)]">
        <div className="shell pt-8 pb-8">
        <SectionBar eyebrow="ბრენდები" title="პოპულარული ბრენდები" href="/search" action="ყველა" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {POPULAR_BRANDS.map((brand) => (
            <Link
              key={brand}
              href={`/search?q=${encodeURIComponent(brand)}`}
              className="flex h-16 items-center justify-center border border-[var(--line-strong)] bg-white text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--brand)] transition-colors hover:border-zinc-900 hover:bg-zinc-950 hover:text-white"
            >
              {brand}
            </Link>
          ))}
        </div>
        </div>
      </section>

      {/* Shops */}
      <section className="shell pt-8 pb-12">
        <SectionBar eyebrow="წყაროები" title="მაღაზიები, სადაც ვადარებთ" href="/shops" action="ყველა მაღაზია" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeShops.slice(0, 3).map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </section>
    </div>
  );
}

function selectHomeDeals(categoryPools: HomeProduct[][]) {
  // Best real discounts per category, then interleaved so the section always
  // shows top sales from every category and store that has any.
  const rankedPools = categoryPools.map((pool) =>
    filterCuratedProducts(pool, { requireImage: true, requireUsefulCategory: true, inStockOnly: true })
      .filter((product) => bestRealDiscount(product) > 0)
      .sort((left, right) => bestRealDiscount(right) - bestRealDiscount(left) || compareDealPriority(left, right)),
  );
  // Lead with the single strongest discount overall (featured card).
  rankedPools.sort((left, right) => bestRealDiscount(right[0] ?? emptyDeal) - bestRealDiscount(left[0] ?? emptyDeal));
  return interleaveBalanced(rankedPools, 6, 4);
}

const emptyDeal = { offers: [] } as unknown as HomeProduct;

function selectFrequentlyCompared(categoryPools: HomeProduct[][], promotedKeys: Set<string>) {
  const rankedPools = categoryPools.map((pool) => {
    const multiStore = filterCuratedProducts(pool, { requireImage: true, requireUsefulCategory: true, requireDiscoveryQuality: true })
      .filter((product) => uniqueShopCount(product) >= 2)
      .sort((left, right) => uniqueShopCount(right) - uniqueShopCount(left) || compareProductPriority(left, right));
    const fallback = filterCuratedProducts(pool, { requireImage: true, requireUsefulCategory: true, inStockOnly: true }).sort(compareProductPriority);
    const merged = dedupeHomepageProducts([...multiStore, ...fallback]);
    const preferred = merged.filter((product) => !homepageDedupKeys(product).some((key) => promotedKeys.has(key)));
    const promotedFallback = merged.filter((product) => homepageDedupKeys(product).some((key) => promotedKeys.has(key)));
    return [...preferred, ...promotedFallback];
  });
  return interleaveBalanced(rankedPools, 8, 5);
}

// Round-robin across category pools with global dedupe and a per-shop cap so
// one store cannot fill an entire section.
function interleaveBalanced(pools: HomeProduct[][], total: number, maxPerShop: number) {
  const queues = pools.map((pool) => [...pool]);
  const result: HomeProduct[] = [];
  const seen = new Set<string>();
  const shopCounts = new Map<string, number>();

  const take = (queue: HomeProduct[], relaxShopCap: boolean) => {
    for (let index = 0; index < queue.length; index += 1) {
      const product = queue[index];
      const keys = homepageDedupKeys(product);
      if (keys.some((key) => seen.has(key))) {
        queue.splice(index, 1);
        index -= 1;
        continue;
      }
      const shopSlug = product.offers[0]?.shop.slug ?? "";
      // Over the cap: leave it in the queue for the relaxed pass.
      if (!relaxShopCap && (shopCounts.get(shopSlug) ?? 0) >= maxPerShop) continue;
      queue.splice(index, 1);
      for (const key of keys) seen.add(key);
      shopCounts.set(shopSlug, (shopCounts.get(shopSlug) ?? 0) + 1);
      result.push(product);
      return true;
    }
    return false;
  };

  for (const relaxShopCap of [false, true]) {
    let progressed = true;
    while (result.length < total && progressed) {
      progressed = false;
      for (const queue of queues) {
        if (result.length >= total) break;
        if (take(queue, relaxShopCap)) progressed = true;
      }
    }
    if (result.length >= total) break;
  }

  return result;
}

function dedupeHomepageProducts(products: HomeProduct[]) {
  const seen = new Set<string>();
  const unique: HomeProduct[] = [];

  for (const product of products) {
    const keys = homepageDedupKeys(product);
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    unique.push(product);
  }

  return unique;
}

function homepageDedupKeys(product: HomeProduct) {
  const identity = objectRecord(product.productIdentity);
  const keys = new Set<string>();
  const add = (kind: string, value: unknown) => {
    const normalized = normalizeHomeKey(value);
    if (normalized) keys.add(`${kind}:${normalized}`);
  };

  add("id", product.id);
  add("canonical-product", identityValue(identity, "canonicalProductId"));
  add("slug", product.slug);
  add("canonical-variant", identityValue(identity, "canonicalVariantKey") ?? identityValue(identity, "canonicalKey") ?? product.canonicalKey);

  const identityParts = [
    product.brand ?? identityValue(identity, "brand"),
    product.model ?? identityValue(identity, "model"),
    identityValue(identity, "ram"),
    identityValue(identity, "storage"),
    identityValue(identity, "color"),
  ]
    .map(normalizeHomeKey)
    .filter(Boolean);
  if (identityParts.length >= 3) keys.add(`identity:${identityParts.join("|")}`);

  add("title", product.name);

  return [...keys];
}

function bestRealDiscount(product: HomeProduct) {
  return Math.max(0, ...product.offers.map((offer) => realDiscountPercent(offer)));
}

function uniqueShopCount(product: HomeProduct) {
  return new Set(product.offers.map((offer) => offer.shop.id)).size;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function identityValue(identity: Record<string, unknown> | null, key: string) {
  const value = identity?.[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function normalizeHomeKey(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u10a0-\u10ff\u1c90-\u1cbf]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Market ticker — compact financial-page strip fed by the Price Index. Hidden
// until enough price history has accrued for the averages to mean anything.
function IndexTicker({ index }: { index: PriceIndex }) {
  if (index.overall.sampleSize < 10) return null;
  const cells = [{ label: "ბაზარი", changePct: index.overall.changePct }, ...index.categories.map((category) => ({ label: category.nameKa, changePct: category.changePct }))];

  return (
    <Link
      href="/price-index"
      className="mb-3 flex items-stretch divide-x divide-[var(--line)] overflow-x-auto border border-[var(--line-strong)] bg-white [-ms-overflow-style:none] [scrollbar-width:none] hover:border-zinc-900"
    >
      {cells.map((cell) => {
        const dropped = cell.changePct < 0;
        return (
          <span key={cell.label} className="flex shrink-0 items-baseline gap-2 px-3.5 py-2.5 sm:px-4">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-gray-400">{cell.label}</span>
            <span className={`text-[13px] font-black tabular-nums ${dropped ? "text-zinc-950" : "text-gray-500"}`}>
              {cell.changePct < 0 ? "▼" : cell.changePct > 0 ? "▲" : "•"} {formatTickerPct(cell.changePct)}
            </span>
          </span>
        );
      })}
      <span className="ml-auto hidden shrink-0 items-center gap-1 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--brand)] sm:flex">
        7 დღე
        <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

function formatTickerPct(value: number) {
  const abs = Math.abs(value).toFixed(1);
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return "0%";
}

function PriceChangeRow({ change }: { change: RecentPriceChange }) {
  const dropped = change.previousPrice != null && change.previousPrice > change.currentPrice;
  const delta = change.previousPrice != null ? Math.abs(change.previousPrice - change.currentPrice) : 0;

  return (
    <li>
      <Link
        href={`/products/${change.productSlug}`}
        className="wire-row flex min-w-0 items-center gap-3 px-3 py-2.5 hover:bg-gray-50 sm:px-4"
      >
        <span
          className={`w-10 shrink-0 text-center text-[13px] font-black tabular-nums ${dropped ? "text-zinc-950" : "text-gray-400"}`}
          aria-hidden
        >
          {dropped ? "▼" : "▲"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{change.productName}</span>
          <span className="block truncate text-[11px] uppercase tracking-[0.06em] text-gray-400">
            {change.shopName} · {formatRelativeTime(change.changedAt)}
          </span>
        </span>
        {delta > 0 && (
          <span
            className={`hidden shrink-0 items-center gap-1 px-2 py-0.5 text-[11px] font-bold tabular-nums sm:inline-flex ${
              dropped ? "bg-zinc-950 text-white" : "border border-zinc-200 bg-white text-zinc-500"
            }`}
          >
            <TrendingDown className={`size-3 ${dropped ? "" : "rotate-180"}`} />
            {dropped ? "-" : "+"}{formatGel(delta)}
          </span>
        )}
        <span className="shrink-0 text-right">
          {change.previousPrice != null && (
            <span className="block text-[11px] tabular-nums text-gray-400 line-through">{formatGel(change.previousPrice)}</span>
          )}
          <span className="block text-sm font-bold tabular-nums text-gray-900">
            {formatGel(change.currentPrice)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function HeroStat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="stat-rule min-w-0">
      <div className="font-display text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
        {(value ?? 0).toLocaleString()}
      </div>
      <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">{label}</div>
    </div>
  );
}

// Server-rendered dateline for the hero kicker (ka-GE long date). The page
// revalidates every 10 minutes, so the date is always current enough.
function georgianDateline() {
  return new Intl.DateTimeFormat("ka-GE", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

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
    <div className="masthead mb-5">
      <div className="masthead-row">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="masthead-kicker">{eyebrow}</p>
          <h2 className="masthead-title min-w-0 truncate">{title}</h2>
          {dealCount != null && (
            <span className="hidden text-xs font-semibold tabular-nums text-[var(--muted)] sm:inline">
              · {dealCount.toLocaleString()} აქცია
            </span>
          )}
        </div>
        <Link href={href} className="masthead-link inline-flex items-center gap-1">
          {action}
          <ArrowRight className="size-3" />
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
    <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-950" strokeWidth={2.25} />
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.05em] text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function HeroMobileDealCard({ product }: { product: ProductView }) {
  const offer = product.offers[0];
  if (!offer) return null;
  const discount = realDiscountPercent(offer);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="w-[150px] shrink-0 snap-start overflow-hidden border border-white/90 bg-white"
    >
      <div className="relative border-b border-gray-100 bg-gray-50">
        <ProductImage src={image} alt={product.name} categorySlug={product.category?.slug} shopName={offer.shop.name} />
        {discount > 0 && (
          <span className="absolute left-2 top-2">
            <DiscountBadge percent={discount} />
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 min-h-[2.1rem] text-[11px] font-semibold leading-snug text-gray-900">{product.name}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-bold text-[var(--accent)]">{formatGel(offer.currentPrice)}</span>
          {offer.oldPrice && offer.oldPrice > offer.currentPrice && (
            <span className="text-[10px] text-gray-400 line-through">{formatGel(offer.oldPrice)}</span>
          )}
        </div>
        <span className="mt-0.5 block truncate text-[10px] text-gray-400">
          {shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : offer.shop.name}
        </span>
      </div>
    </Link>
  );
}

function HeroPromo({
  href,
  badge,
  badgeTone,
  title,
  subtitle,
  icon,
}: {
  href: string;
  badge: string;
  badgeTone: "accent" | "save";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="card-hover group relative flex items-center gap-4 border border-white/90 bg-white p-4"
    >
      {/* icon block — framed print vignette */}
      <span className="grid size-14 shrink-0 place-items-center border border-zinc-900 bg-zinc-950 text-white">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
            badgeTone === "save"
              ? "border border-zinc-900 bg-white text-zinc-900"
              : "bg-zinc-950 text-white"
          }`}
        >
          {badge}
        </span>
        <p className="font-display mt-1.5 truncate text-[16px] font-bold text-[var(--brand)]">{title}</p>
        <p className="truncate text-xs font-medium text-[var(--muted)]">{subtitle}</p>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-[var(--muted)] transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-950" />
    </Link>
  );
}

function HeroProduct({ product }: { product: ProductView }) {
  const offer = product.offers[0];
  if (!offer) return null;

  const discount = realDiscountPercent(offer);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;
  const savings = offer.oldPrice && offer.oldPrice > offer.currentPrice ? offer.oldPrice - offer.currentPrice : 0;

  return (
    <div className="drop-shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
      {/* Hot-deal ribbon */}
      <div className="flex items-center gap-1.5 rounded-t-2xl bg-[var(--accent-strong)] px-4 py-2 text-[12px] font-bold text-white">
        <Flame className="size-3.5" />
        დღის ცხელი შეთავაზება
      </div>
      <article className="overflow-hidden rounded-b-2xl bg-white">
        <Link href={`/products/${product.slug}`} className="relative block border-b border-gray-100 bg-gray-50">
          <ProductImage src={image} alt={product.name} priority tall />
          {discount > 0 && (
            <span className="absolute right-3 top-3">
              <DiscountBadge percent={discount} />
            </span>
          )}
        </Link>
        <div className="grid gap-2.5 p-4">
          <div className="flex items-center gap-2">
            <ShopMark shop={offer.shop} size="sm" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">{offer.shop.name}</span>
            {offer.availability === "IN_STOCK" ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--aqua)]">
                <span className="size-1.5 rounded-full bg-[var(--aqua)]" />
                მარაგში
              </span>
            ) : (
              <AvailabilityBadge availability={offer.availability} hideUnknown />
            )}
          </div>
          <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 hover:text-[var(--accent)]">
            {product.name}
          </Link>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} strong deal={discount > 0} />
            {savings > 0 && (
              <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent-strong)]">
                დაზოგე {formatGel(savings)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Store className="size-3.5" />
            <span>{shopCount > 1 ? `${shopCount} მაღაზია` : `${shopCount} მაღაზიის შეთავაზება`}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/products/${product.slug}`} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50">
              <ArrowUpDown className="size-3.5" />
              შედარება
            </Link>
            <ShopClickLink
              offerId={offer.id}
              productId={product.id}
              productName={product.name}
              category={product.category?.slug}
              shopName={offer.shop.name}
              price={offer.currentPrice}
              sourceUrl={offer.url}
              ariaLabel={`${offer.shop.name} შეთავაზება`}
              title="შეთავაზება"
              className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              ნახვა
              <ArrowUpRight className="size-3.5" />
            </ShopClickLink>
          </div>
        </div>
      </article>
    </div>
  );
}

function FeaturedDeal({ product }: { product: ProductView }) {
  const offer = product.offers[0];
  if (!offer) return null;

  const discount = realDiscountPercent(offer);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;
  const savings = offer.oldPrice && offer.oldPrice > offer.currentPrice ? offer.oldPrice - offer.currentPrice : 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border-2 border-zinc-900 bg-white shadow-sm">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-gray-100 bg-gray-50">
        <ProductImage src={image} alt={product.name} priority tall />
        <span className="absolute left-3 top-3 rounded-md bg-zinc-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          დღის ლიდერი
        </span>
        {discount > 0 && (
          <span className="absolute right-3 top-3">
            <DiscountBadge percent={discount} />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
            <ShopMark shop={offer.shop} size="sm" />
            {offer.shop.name}
          </span>
          <AvailabilityBadge availability={offer.availability} />
        </div>

        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 hover:text-[var(--accent)]">
          {product.name}
        </Link>

        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} strong deal={discount > 0} />

        {savings > 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-900">
            <TrendingDown className="size-3" /> -{formatGel(savings)}
          </span>
        )}

        <div className="mt-auto flex items-center gap-1.5 border-t border-gray-100 pt-2.5 text-[11px] text-gray-400">
          <Store className="size-3 shrink-0" />
          <span>{shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : `${product.offers.length} შეთავაზება`}</span>
          <LastUpdatedText value={offer.lastSeenAt} className="ml-auto" />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Link href={`/products/${product.slug}`} className="flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]">
            შედარება
          </Link>
          <ShopClickLink
            offerId={offer.id}
            productId={product.id}
            productName={product.name}
            category={product.category?.slug}
            shopName={offer.shop.name}
            price={offer.currentPrice}
            sourceUrl={offer.url}
            ariaLabel={`${offer.shop.name} შეთავაზება`}
            title="შეთავაზება"
            className="flex h-10 items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            ნახვა
            <ArrowUpRight className="size-3.5" />
          </ShopClickLink>
        </div>
      </div>
    </article>
  );
}
