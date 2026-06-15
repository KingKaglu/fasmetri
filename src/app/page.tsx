import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  Laptop,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
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

const quickCategories = [
  { href: "/categories/mobiles", label: "ტელეფონები", icon: Smartphone },
  { href: "/categories/laptops", label: "ლეპტოპები", icon: Laptop },
  { href: "/deals", label: "აქციები", icon: BadgePercent },
  { href: "/search", label: "ძებნა", icon: Search },
];

type HomeProduct = Awaited<ReturnType<typeof listPublicProducts>>[number];

export default async function Home() {
  // One pool per public category so the front page always mixes phones and
  // laptops instead of whatever a single global sort happens to surface.
  const [categoryDeals, categoryPopular, shops, stats, categories, priceChanges] = await Promise.all([
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
  ]);
  // listPublicShops already returns only publicly active shops (same list as
  // /shops and the filter dropdowns), sorted by product count.
  const activeShops = shops;
  const discounts = selectHomeDeals(categoryDeals);
  const promotedKeys = new Set(discounts.flatMap(homepageDedupKeys));
  const trending = selectFrequentlyCompared(categoryPopular, promotedKeys);
  const heroProduct = discounts[0] ?? trending[0];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="shell pt-5 pb-6 sm:pt-7 sm:pb-8">
        <div className="hero-frame overflow-hidden">
          <div className="relative z-10 grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:gap-12 lg:p-10">
            {/* Left: copy + search */}
            <div className="flex min-w-0 flex-col justify-center py-2">
              {/* Category quick links */}
              <div className="mb-5 flex min-w-0 flex-wrap gap-2">
                {quickCategories.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/18 hover:text-white"
                  >
                    <Icon className="size-3.5 opacity-70" />
                    {label}
                  </Link>
                ))}
              </div>

              <h1 className="text-3xl font-bold leading-[1.1] text-white sm:text-4xl lg:text-5xl">
                შეადარე ფასები<br />
                <span className="text-blue-400">ქართულ მაღაზიებში</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
                ფასმეტრი აერთიანებს ქართულ ონლაინ მაღაზიებს ერთ კატალოგში — სწრაფად ნახე სად არის საუკეთესო ფასი.
              </p>

              <div className="mt-5 max-w-xl">
                <SearchBar large />
              </div>

              {/* Stats row */}
              <div className="mt-5 flex flex-wrap gap-4">
                <HeroStat label="მაღაზია" value={stats.shops} />
                <HeroStat label="პროდუქტი" value={stats.products} />
                <HeroStat label="აქტიური აქცია" value={stats.deals} />
              </div>
            </div>

            {/* Right: featured product */}
            <div className="hidden lg:block lg:w-[280px] xl:w-[300px]">
              {heroProduct ? (
                <HeroProduct product={heroProduct} />
              ) : (
                <div className="glass-panel grid min-h-[22rem] place-items-center rounded-xl p-6 text-center">
                  <div>
                    <Search className="mx-auto size-8 text-blue-400" />
                    <p className="mt-3 text-base font-semibold text-white">კატალოგი იტვირთება</p>
                  </div>
                </div>
              )}
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
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.slice(0, 2).map((category) => (
              <CategoryCard key={category.id} category={category} />
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
    <div className="flex items-baseline gap-1.5">
      <span className="text-xl font-bold tabular-nums text-white">{(value ?? 0).toLocaleString()}</span>
      <span className="text-xs text-white/55">{label}</span>
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
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function HeroProduct({ product }: { product: ProductView }) {
  const offer = product.offers[0];
  if (!offer) return null;

  const discount = realDiscountPercent(offer);
  const image = offer.imageUrl ?? product.imageUrl;
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;

  return (
    <article className="overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
      <Link href={`/products/${product.slug}`} className="relative block">
        <ProductImage src={image} alt={product.name} priority tall />
        <span className="absolute left-3 top-3 rounded-md bg-blue-500 px-2 py-1 text-[11px] font-semibold text-white">
          რჩეული
        </span>
        {discount > 0 && (
          <span className="absolute right-3 top-3">
            <DiscountBadge percent={discount} />
          </span>
        )}
      </Link>
      <div className="grid gap-2.5 p-3.5">
        <div className="flex items-center gap-2">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-white/70">{offer.shop.name}</span>
          <AvailabilityBadge availability={offer.availability} />
        </div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-white hover:text-blue-300">
          {product.name}
        </Link>
        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} strong deal={discount > 0} tone="light" />
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <Store className="size-3.5" />
          <span>{shopCount > 1 ? `${shopCount} მაღაზია` : `${product.offers.length} შეთავაზება`}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Link href={`/products/${product.slug}`} className="flex h-9 items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-gray-900 hover:bg-blue-50">
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
            className="flex h-9 items-center justify-center gap-1 rounded-md border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/18"
          >
            ნახვა
            <ArrowUpRight className="size-3.5" />
          </ShopClickLink>
        </div>
      </div>
    </article>
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
          <Link href={`/products/${product.slug}`} className="flex h-10 items-center justify-center rounded-md bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-black">
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
