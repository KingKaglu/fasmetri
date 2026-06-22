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
import { ProductView } from "@/lib/catalog-types";
import { formatGel, formatRelativeTime } from "@/lib/format";
import { CategoryCard } from "@/components/category-card";
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
  const [categoryDeals, categoryPopular, shops, stats, categories, priceChanges, gamingPool] = await Promise.all([
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
      {/* Hero */}
      <section className="shell pt-5 pb-6 sm:pt-7 sm:pb-8">
        <div className="hero-frame overflow-hidden">
          <div className="relative z-10 grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:gap-12 lg:p-10">
            {/* Left: copy + search */}
            <div className="flex min-w-0 flex-col justify-center py-2">
              {/* Brand badge */}
              <div className="mb-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-1 pr-3.5 backdrop-blur-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white">
                    <svg viewBox="0 0 32 28" className="size-4" fill="none" aria-hidden="true">
                      <path d="M8.63 22.17 A9 9 0 1 1 23.37 22.17" stroke="var(--accent)" strokeWidth="2.7" strokeLinecap="round" />
                      <path d="M16 17 L10.9 21.3" stroke="var(--aqua)" strokeWidth="2.7" strokeLinecap="round" />
                      <circle cx="16" cy="17" r="2.4" fill="var(--accent)" />
                    </svg>
                  </span>
                  <span className="text-[13px] font-bold text-white">ფასმეტრი</span>
                  <span className="hidden text-white/40 sm:inline">·</span>
                  <span className="hidden text-[13px] font-medium text-white/70 sm:inline">ფასების შედარების პლატფორმა</span>
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-[1.12] text-white sm:text-4xl lg:text-5xl">
                შეადარე <span className="hero-highlight">ფასები</span> ქართულ მაღაზიებში
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
                ფასმეტრი აერთიანებს ქართულ ონლაინ მაღაზიებს ერთ კატალოგში — სწრაფად ნახე სად არის საუკეთესო ფასი.
              </p>

              {/* Category filter tabs */}
              <div className="mt-5 flex min-w-0 flex-wrap gap-2">
                {heroTabs.map(({ href, label, active }) => (
                  <Link
                    key={href}
                    href={href}
                    className={
                      active
                        ? "inline-flex shrink-0 items-center rounded-full bg-white px-4 py-1.5 text-[13px] font-bold text-[var(--brand)] shadow-sm"
                        : "inline-flex shrink-0 items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white/85 hover:bg-white/20 hover:text-white"
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="mt-5 max-w-xl">
                <SearchBar large />
              </div>

              {/* Stats panel */}
              <div className="mt-6 max-w-xl">
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm sm:gap-3 sm:p-3">
                  <HeroStat label="მაღაზია" value={stats.shops} />
                  <HeroStat label="პროდუქტი" value={stats.products} />
                  <HeroStat label="აქტიური აქცია" value={stats.deals} />
                </div>
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
                icon={<Smartphone className="size-9 text-[var(--accent)]" />}
              />
              <HeroPromo
                href="/categories/laptops"
                badge="-15%"
                badgeTone="save"
                title="გეიმინგ ლეპტოპები"
                subtitle="RTX 5060 — დან"
                icon={<Laptop className="size-9 text-[var(--accent)]" />}
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
      <section className="shell pt-8 pb-4">
        <SectionBar eyebrow="ფასდაკლებები" title="დღის საუკეთესო ფასები" href="/deals" action="ყველა აქცია" dealCount={stats.deals ?? null} />
        {discounts.length ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <FeaturedDeal product={discounts[0]} />
            </div>
            <div className="lg:col-span-8">
              <div className="product-grid-dense grid">
                {discounts.slice(1, 6).map((product, index) => (
                  <ProductCard key={product.id} product={product} deal imagePriority={index < 2} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ProductGrid products={discounts} deal density="compact" resetHref="/deals" emptyTitle="აქციები მალე გამოჩნდება" emptyDescription="ფასმეტრი ახალი ფასდაკლებების დამატებისთანავე აჩვენებს საუკეთესო შეთავაზებებს." />
        )}
      </section>

      {/* Consoles / PlayStation 5 — cross-shop comparison */}
      {gamingProducts.length > 0 && (
        <section className="shell pt-8 pb-4">
          <SectionBar
            eyebrow="კონსოლები"
            title="PlayStation 5 — შეადარე მაღაზიებში"
            href="/categories/gaming"
            action="ყველა კონსოლი"
          />
          <ProductGrid
            products={gamingProducts}
            density="compact"
            resetHref="/categories/gaming"
            priorityImages={0}
            emptyTitle="კონსოლები მალე დაემატება"
            emptyDescription="PlayStation 5 და აქსესუარები მაღაზიების მიხედვით."
          />
        </section>
      )}

      {/* Recently updated prices */}
      {priceChanges.length > 0 && (
        <section className="shell pt-8 pb-4">
          <SectionBar eyebrow="ფასების მონიტორინგი" title="ახლახანს განახლებული ფასები" href="/deals" action="ყველა აქცია" />
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-100">
              {priceChanges.map((change) => (
                <PriceChangeRow key={change.offerId} change={change} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Trending */}
      <section className="shell pt-8 pb-4">
        <SectionBar eyebrow="ხშირად შედარებული" title="პოპულარული პროდუქტები" href="/search?sort=priority" action="ყველა" />
        <ProductGrid products={trending} density="compact" resetHref="/search" priorityImages={0} emptyTitle="პოპულარული პროდუქტები მალე დაემატება" emptyDescription="ახალი შეთავაზებები განახლებისთანავე გამოჩნდება." />
      </section>

      {/* Popular brands (retail handoff) */}
      <section className="shell pt-8 pb-4">
        <SectionBar eyebrow="ბრენდები" title="პოპულარული ბრენდები" href="/search" action="ყველა" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {POPULAR_BRANDS.map((brand) => (
            <Link
              key={brand}
              href={`/search?q=${encodeURIComponent(brand)}`}
              className="flex h-16 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-sm font-extrabold text-[var(--brand)] shadow-[var(--shadow-card)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {brand}
            </Link>
          ))}
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

function PriceChangeRow({ change }: { change: RecentPriceChange }) {
  const dropped = change.previousPrice != null && change.previousPrice > change.currentPrice;
  const delta = change.previousPrice != null ? Math.abs(change.previousPrice - change.currentPrice) : 0;

  return (
    <li>
      <Link
        href={`/products/${change.productSlug}`}
        className="flex min-w-0 items-center gap-3 px-3 py-2.5 hover:bg-gray-50 sm:px-4"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-gray-200 bg-white text-[10px] font-semibold text-gray-500">
          {change.shopName.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{change.productName}</span>
          <span className="block truncate text-[11px] text-gray-400">
            {change.shopName} · {formatRelativeTime(change.changedAt)}
          </span>
        </span>
        {delta > 0 && (
          <span
            className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-flex ${
              dropped ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
            }`}
          >
            <TrendingDown className={`size-3 ${dropped ? "" : "rotate-180"}`} />
            {dropped ? "-" : "+"}{formatGel(delta)}
          </span>
        )}
        <span className="shrink-0 text-right">
          {change.previousPrice != null && (
            <span className="block text-[11px] text-gray-400 line-through">{formatGel(change.previousPrice)}</span>
          )}
          <span className={`block text-sm font-bold ${dropped ? "text-green-700" : "text-gray-900"}`}>
            {formatGel(change.currentPrice)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function HeroStat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2 text-center sm:py-2.5">
      <div className="text-xl font-black tabular-nums text-white sm:text-2xl">{(value ?? 0).toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] font-medium text-white/55">{label}</div>
    </div>
  );
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
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{eyebrow}</p>
        <h2 className="mt-0.5 text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {dealCount != null && (
          <span className="hidden rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-500 sm:inline">
            {dealCount.toLocaleString()} აქცია
          </span>
        )}
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
          {action}
          <ArrowRight className="size-3.5" />
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
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
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
      className="w-[150px] shrink-0 snap-start overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
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
      className="group flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="min-w-0 flex-1">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${
            badgeTone === "save" ? "bg-[var(--price-deal)]" : "bg-[var(--accent)]"
          }`}
        >
          {badge}
        </span>
        <p className="mt-1.5 truncate text-[15px] font-extrabold text-[var(--brand)]">{title}</p>
        <p className="truncate text-xs font-medium text-[var(--muted)]">{subtitle}</p>
      </div>
      <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)]">{icon}</span>
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
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border-2 border-orange-200 bg-white shadow-sm">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-gray-100 bg-gray-50">
        <ProductImage src={image} alt={product.name} priority tall />
        <span className="absolute left-3 top-3 rounded-md bg-orange-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
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
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
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
