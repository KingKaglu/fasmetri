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
import { getCatalogStats, listPublicCategories, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
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
  const [discoveryCandidates, shops, stats, categories] = await Promise.all([
    listPublicProducts({ categorySlugs: PRIORITY_CATEGORIES, sort: "priority", pageSize: 200, candidateLimit: 240 }),
    listPublicShops(),
    getCatalogStats(),
    listPublicCategories(),
  ]);
  const activeShops = shops
    .filter((shop) => (shop.productCount ?? 0) > 0)
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));
  const discounts = selectHomeDeals(discoveryCandidates);
  const promotedKeys = new Set(discounts.flatMap(homepageDedupKeys));
  const trending = selectFrequentlyCompared(discoveryCandidates, promotedKeys);
  const heroProduct = discounts[0] ?? trending[0];

  return (
    <div className="min-h-screen">
      <section className="shell pt-4 sm:pt-6">
        <div className="category-rail flex w-full min-w-0 gap-2 overflow-x-auto pb-3">
          {quickCategories.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3.5 py-2 text-xs font-black text-[var(--brand)] shadow-[0_8px_20px_rgba(18,19,15,0.05)] hover:-translate-y-0.5 hover:bg-[var(--accent-soft)]"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="shell pb-8">
        <div className="hero-frame grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.72fr)] lg:p-8">
          <div className="relative z-10 flex min-w-0 flex-col justify-center py-4">
            <p className="eyebrow inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[var(--accent)]">
              <Sparkles className="size-3.5" />
              ფასების ცოცხალი შედარება
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-6xl">
              იპოვე რეალური ფასი, სანამ იყიდი.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/74 sm:text-base">
              ფასმეტრი აერთიანებს ქართულ ონლაინ მაღაზიებს ერთ სუფთა კატალოგში, რომ სწრაფად დაინახო სად არის უკეთესი ფასი, აქცია და მარაგი.
            </p>
            <div className="mt-6 max-w-2xl">
              <SearchBar large />
            </div>
            <div className="mt-6 grid max-w-2xl gap-2 min-[360px]:grid-cols-3">
              <HeroStat label="მაღაზია" value={stats.shops} />
              <HeroStat label="უნიკალური პროდუქტი" value={stats.products} />
              <HeroStat label="სულ აქტიური აქცია" value={stats.deals} />
            </div>
            <p className="mt-3 max-w-2xl text-xs font-bold leading-5 text-white/58">
              ერთი პროდუქტი შეიძლება რამდენიმე მაღაზიაში იყოს წარმოდგენილი, ამიტომ შეთავაზებების რაოდენობა შეიძლება პროდუქტის რაოდენობაზე მეტი იყოს.
            </p>
          </div>

          <div className="relative z-10">
            {heroProduct ? (
              <HeroProduct product={heroProduct} />
            ) : (
              <div className="glass-panel grid min-h-[22rem] place-items-center rounded-3xl p-6 text-center">
                <div>
                  <Search className="mx-auto size-8 text-[var(--accent)]" />
                  <p className="mt-3 text-lg font-black text-white">კატალოგი იტვირთება</p>
                  <p className="mt-1 text-sm text-white/68">ახალი პროდუქტები მალე გამოჩნდება.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {categories.length ? (
        <section className="shell py-4 sm:py-6">
          <SectionBar eyebrow="კატეგორიები" title="დაიწყე ყველაზე მოთხოვნადიდან" href="/categories" action="ყველა კატეგორია" />
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.slice(0, 2).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="shell pt-8 sm:pt-10">
        <SectionBar eyebrow="დღის ფასი" title="დღის საუკეთესო ფასები" href="/deals" action="ყველა აქცია" dealCount={stats.deals ?? null} />
        {discounts.length ? (
          <div className="grid gap-3 lg:grid-cols-12">
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
          <ProductGrid
            products={discounts}
            deal
            density="compact"
            resetHref="/deals"
            emptyTitle="აქციები მალე გამოჩნდება"
            emptyDescription="ფასმეტრი ახალი ფასდაკლებების დამატებისთანავე აჩვენებს საუკეთესო შეთავაზებებს."
          />
        )}
      </section>

      <section className="shell pt-10 sm:pt-12">
        <SectionBar eyebrow="ხშირად შედარებული" title="პროდუქტები, რომლებსაც ხშირად ადარებენ" href="/search?sort=priority" action="ყველა" />
        <ProductGrid products={trending} density="compact" resetHref="/search" emptyTitle="პოპულარული პროდუქტები მალე დაემატება" emptyDescription="ახალი შეთავაზებები განახლებისთანავე გამოჩნდება." />
      </section>

      <section className="mt-12 border-y border-[var(--line)] bg-white/70">
        <div className="shell grid gap-0 divide-y divide-[var(--line)] py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <TrustItem
            icon={ShieldCheck}
            title="ფასები რეგულარულად ახლდება"
            description="კატალოგი ყოველდღიურად ამოწმებს ფასს, მარაგს და ფასდაკლებას."
          />
          <TrustItem
            icon={Store}
            title="ერთი ძებნა, ბევრი მაღაზია"
            description={`${stats.shops ?? "რამდენიმე"} ქართული მაღაზია ერთ შედარებად კატალოგში.`}
          />
          <TrustItem
            icon={TrendingDown}
            title="დაზოგე ზედმეტი ფიქრის გარეშე"
            description="ყველაზე დაბალი ფასი და ფასდაკლება ბარათზევე ჩანს."
          />
        </div>
      </section>

      <section className="shell pb-12 pt-10 sm:pb-16 sm:pt-12">
        <SectionBar eyebrow="წყაროები" title="მაღაზიები, რომლებსაც ვადარებთ" href="/shops" action="ყველა მაღაზია" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeShops.slice(0, 3).map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </section>
    </div>
  );
}

function selectHomeDeals(products: HomeProduct[]) {
  const deals = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, inStockOnly: true })
    .filter((product) => bestRealDiscount(product) > 0)
    .sort((left, right) => bestRealDiscount(right) - bestRealDiscount(left) || compareDealPriority(left, right));

  return dedupeHomepageProducts(deals).slice(0, 6);
}

function selectFrequentlyCompared(products: HomeProduct[], promotedKeys: Set<string>) {
  const multiStore = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, requireDiscoveryQuality: true })
    .filter((product) => uniqueShopCount(product) >= 2)
    .sort((left, right) => uniqueShopCount(right) - uniqueShopCount(left) || compareProductPriority(left, right));
  const fallback = filterCuratedProducts(products, { requireImage: true, requireUsefulCategory: true, inStockOnly: true }).sort(compareProductPriority);
  const uniqueProducts = dedupeHomepageProducts([...multiStore, ...fallback]);
  const preferred = uniqueProducts.filter((product) => !homepageDedupKeys(product).some((key) => promotedKeys.has(key)));
  const promotedFallback = uniqueProducts.filter((product) => homepageDedupKeys(product).some((key) => promotedKeys.has(key)));

  return [...preferred, ...promotedFallback].slice(0, 8);
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

function HeroStat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 p-3">
      <p className="text-2xl font-black leading-none text-white">{(value ?? 0).toLocaleString()}</p>
      <p className="mt-1 text-[11px] font-bold text-white/58">{label}</p>
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
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <p className="eyebrow text-[var(--accent-strong)]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-[var(--brand)] sm:text-3xl">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {dealCount != null && (
          <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--muted)] sm:inline">
            სულ {dealCount.toLocaleString()} აქტიური აქცია
          </span>
        )}
        <Link href={href} className="inline-flex h-10 items-center gap-1 rounded-full bg-[var(--brand)] px-4 text-sm font-black text-white hover:bg-black">
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
    <div className="flex items-start gap-3 px-1 py-4 sm:px-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--brand)]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-[var(--brand)]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{description}</p>
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
    <article className="glass-panel group overflow-hidden rounded-3xl">
      <Link href={`/products/${product.slug}`} className="relative block">
        <ProductImage src={image} alt={product.name} priority tall />
        <span className="absolute left-3 top-3 inline-flex rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-black text-[var(--accent-ink)]">
          რჩეული ფასი
        </span>
        {discount > 0 ? (
          <span className="absolute right-3 top-3">
            <DiscountBadge percent={discount} />
          </span>
        ) : null}
      </Link>
      <div className="grid gap-3 p-4">
        <div className="flex items-center gap-2">
          <ShopMark shop={offer.shop} size="sm" />
          <span className="min-w-0 flex-1 truncate text-xs font-black text-white">{offer.shop.name}</span>
          <AvailabilityBadge availability={offer.availability} />
        </div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-lg font-black leading-snug text-white hover:text-[var(--accent)]">
          {product.name}
        </Link>
        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} strong deal={discount > 0} tone="light" />
        <div className="flex items-center gap-2 text-xs font-bold text-white/64">
          <Store className="size-3.5" />
          <span>{shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : `${product.offers.length} შეთავაზება`}</span>
          <LastUpdatedText value={offer.lastSeenAt} className="ml-auto text-white/58" />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link href={`/products/${product.slug}`} className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-[var(--brand)] hover:bg-[var(--accent)]">
            ფასის შედარება
          </Link>
          <ShopClickLink
            offerId={offer.id}
            productId={product.id}
            productName={product.name}
            category={product.category?.slug}
            shopName={offer.shop.name}
            price={offer.currentPrice}
            sourceUrl={offer.url}
            ariaLabel={`${offer.shop.name} შეთავაზების ნახვა`}
            title="შეთავაზების ნახვა"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/18"
          >
            <span>შეთავაზების ნახვა</span>
            <ArrowUpRight className="size-4" />
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
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--brand)] bg-white shadow-[0_18px_42px_rgba(18,19,15,0.12)]">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden border-b border-[var(--line)]">
        <ProductImage src={image} alt={product.name} priority tall />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--brand)] px-3 py-1 text-[10px] font-black uppercase text-[var(--accent)]">
          დღის ლიდერი
        </span>
        {discount > 0 && (
          <span className="absolute right-3 top-3">
            <DiscountBadge percent={discount} />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-black">
            <ShopMark shop={offer.shop} size="sm" />
            <span className="truncate text-[var(--brand)]">{offer.shop.name}</span>
          </span>
          <AvailabilityBadge availability={offer.availability} />
        </div>

        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-base font-black leading-snug text-[var(--brand)] hover:text-[var(--accent-strong)]">
          {product.name}
        </Link>

        <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} strong deal={discount > 0} />

        {savings > 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--savings-soft)] px-2 py-1 text-[11px] font-black text-[var(--savings)]">
            <TrendingDown className="size-3" /> დაზოგე {formatGel(savings)}
          </span>
        )}

        <div className="mt-auto flex items-center gap-1.5 border-t border-[var(--line)] pt-3 text-[11px] font-bold text-[var(--muted)]">
          <Store className="size-3 shrink-0" />
          <span className="min-w-0 truncate">
            {shopCount > 1 ? <span className="font-black text-[var(--brand)]">{shopCount} მაღაზია</span> : `${product.offers.length} შეთავაზება`}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="ml-auto shrink-0" />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link href={`/products/${product.slug}`} className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--brand)] px-3 text-sm font-black text-white hover:bg-black">
            ფასების შედარება
          </Link>
          <ShopClickLink
            offerId={offer.id}
            productId={product.id}
            productName={product.name}
            category={product.category?.slug}
            shopName={offer.shop.name}
            price={offer.currentPrice}
            sourceUrl={offer.url}
            ariaLabel={`${offer.shop.name} შეთავაზების ნახვა`}
            title="შეთავაზების ნახვა"
            className="btn-outline inline-flex h-11 items-center justify-center gap-1.5 px-3 text-xs"
          >
            <span>შეთავაზების ნახვა</span>
            <ArrowUpRight className="size-4" />
          </ShopClickLink>
        </div>
      </div>
    </article>
  );
}
