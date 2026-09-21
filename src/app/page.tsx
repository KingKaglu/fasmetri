import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, ArrowUpRight, ShieldCheck, Store, TrendingDown } from "lucide-react";
import { getCatalogStats, listPublicCategories, listPublicProducts } from "@/lib/catalog";
import { CategoryView, ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { CardToggles } from "@/components/card-toggles";
import { categoryIcon } from "@/components/category-card";
import { RecentlyViewedStrip } from "@/components/recently-viewed";
import { SearchBar } from "@/components/search-bar";
import { ProductImage, realDiscountPercent } from "@/components/public-ui";
import {
  compareDealPriority,
  compareProductPriority,
  filterCuratedProducts,
  isPriorityCategory,
  PRIORITY_CATEGORIES,
} from "@/config/productCuration";

export const metadata: Metadata = {
  // The Latin spelling is carried in the title and description on purpose: the
  // brand is searched as "fasmetri" far more often than as "ფასმეტრი", and the
  // page is otherwise 100% Georgian, so nothing else on it matches that query.
  title: "ფასმეტრი (Fasmetri) — შეადარე ფასები ქართულ ონლაინ მაღაზიებში",
  description:
    "Fasmetri.ge — შეადარე მობილურებისა და ლეპტოპების ფასები ქართულ ონლაინ მაღაზიებში. იპოვე საუკეთესო შეთავაზება და ყიდვამდე გადაამოწმე ფასი ოფიციალურ გვერდზე.",
  alternates: { canonical: "/" },
};

export const revalidate = 600;

type HomeProduct = Awaited<ReturnType<typeof listPublicProducts>>[number];

// Density budget. Every category leader (idealo, Skroutz, Geizhals, hotline,
// PriceRunner, trovaprezzi) treats the homepage as navigation: ≤14 categories
// as compact tiles, product rows as rails of a handful of cards, never grids.
// These caps are counts, not identities — WHICH categories and products fill
// them is decided by the live catalog on every revalidate.
const CATEGORY_TILES = 12; // 6×2 desktop; CSS hides the last 4 below 480px (8 = 2×4)
const RAIL_SIZE = 8; // a phone rail shows ~2.2 cards; 8 is two swipes of runway

export default async function Home() {
  // The homepage pools are built from the LIVE public category list, not from a
  // hardcoded pair of slugs: every public category that currently has products
  // gets its own pool, so a product imported into any public category can reach
  // the front page with no code edit. listPublicCategories() reads the same
  // cached public-catalog summary that getCatalogStats() below reads (and
  // getPublicCatalogSummary de-dupes the in-flight promise), so this await
  // costs no additional database round trip. It is already sorted by product
  // count descending, which is exactly the order the category band wants.
  const categories = await listPublicCategories();
  const poolSlugs = (categories.length ? categories.map((category) => category.slug) : [...PRIORITY_CATEGORIES])
    // PRIORITY_CATEGORIES survives only as a RANKING boost here: priority pools
    // are drawn from first in the round-robin (and score higher inside
    // calculateProductPriority). They are no longer a hard filter.
    .slice()
    .sort((left, right) => Number(isPriorityCategory(right)) - Number(isPriorityCategory(left)));

  // One pool per public category so the front page always mixes categories
  // instead of whatever a single global sort happens to surface.
  const [categoryDeals, categoryPopular, stats] = await Promise.all([
    Promise.all(
      poolSlugs.map((category) => listPublicProducts({ category, dealsOnly: true, sort: "discount", pageSize: 60 })),
    ),
    Promise.all(poolSlugs.map((category) => listPublicProducts({ category, sort: "priority", pageSize: 80 }))),
    getCatalogStats(),
  ]);

  const discounts = selectHomeDeals(categoryDeals);
  const promotedKeys = new Set(discounts.flatMap(homepageDedupKeys));
  const trending = selectFrequentlyCompared(categoryPopular, promotedKeys);
  // The comparison section is whatever the catalog actually compares best right
  // now — the category with the deepest cross-shop coverage. No product name is
  // written into the markup.
  const comparison = selectComparisonSpotlight(poolSlugs, categoryPopular, categories);

  const dealRail = discounts.slice(0, RAIL_SIZE);
  const dealRailIds = new Set(dealRail.map((product) => product.id));
  // Exactly one promo slot, and it is filled from data: the best genuine
  // discount that the deals rail did not already show, else the product the
  // most shops are comparing.
  const promo =
    discounts.find((product) => !dealRailIds.has(product.id)) ?? comparison?.products[0] ?? trending[0] ?? null;
  const categoryTiles = categories.slice(0, CATEGORY_TILES);

  return (
    <div className="min-h-screen">
      {/* ── 1+2. Search is the hero. No image hero, one scale-stat line. ── */}
      <section className="home-hero">
        <div className="shell py-8 sm:py-12">
          <h1 className="font-display max-w-3xl text-[30px] font-bold leading-[1.12] text-[var(--brand)] sm:text-[44px]">
            შეადარე ფასები და იყიდე იაფად
          </h1>
          <p className="mt-2.5 text-[13px] font-medium text-[var(--muted-strong)] sm:text-[15px]">
            {(stats.products ?? 0).toLocaleString()} პროდუქტი {(stats.shops ?? 0).toLocaleString()} ქართული
            მაღაზიიდან — Fasmetri ერთ კატალოგში.
          </p>
          <div className="mt-5 max-w-2xl">
            <SearchBar large />
          </div>
        </div>
      </section>

      {/* ── 3. Category band — navigation, one h2 for the whole band ── */}
      {categoryTiles.length > 0 && (
        <section className="border-b border-[var(--line)] bg-white">
          <div className="shell py-7 sm:py-9">
            <RowHead title="კატეგორიები" href="/categories" action="ყველა კატეგორია" />
            <nav className="cat-band" aria-label="კატეგორიები">
              {categoryTiles.map((category, index) => (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  // The order is product-count descending, so the 8 tiles a
                  // phone shows are the 8 largest categories and the long tail
                  // lives on /categories. Nothing here names a slug.
                  className={index < 8 ? "cat-tile" : "cat-tile cat-tile-wide"}
                >
                  <span className="cat-ico">{categoryIcon(category.slug)}</span>
                  <span>{category.nameKa}</span>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      )}

      {/* Recently viewed — client-only, renders nothing until there is history */}
      <RecentlyViewedStrip />

      {/* ── 4. Deals rail ─────────────────────────────────────── */}
      {dealRail.length > 0 && (
        <section className="border-b border-[var(--line)]">
          <div className="shell py-7 sm:py-9">
            <RowHead
              title="დღის საუკეთესო ფასები"
              meta={stats.deals ? `${stats.deals.toLocaleString()} აქტიური აქცია` : undefined}
              href="/deals"
              action="ყველა აქცია"
            />
            <Rail products={dealRail} priority />
          </div>
        </section>
      )}

      {/* ── 5. Promo slot — exactly one banner, no carousel ───── */}
      {promo && (
        <section className="border-b border-[var(--line)] bg-white">
          <div className="shell py-5 sm:py-6">
            <h2 className="sr-only">შერჩეული შეთავაზება</h2>
            <PromoBanner product={promo} />
          </div>
        </section>
      )}

      {/* ── 6. Popular products rail ──────────────────────────── */}
      {trending.length > 0 && (
        <section className="border-b border-[var(--line)]">
          <div className="shell py-7 sm:py-9">
            <RowHead title="პოპულარული პროდუქტები" href="/search?sort=priority" action="ყველა" />
            <Rail products={trending.slice(0, RAIL_SIZE)} />
          </div>
        </section>
      )}

      {/* ── 7. Comparison spotlight — deepest cross-shop coverage ── */}
      {comparison && (
        <section className="border-b border-[var(--line)] bg-white">
          <div className="shell py-7 sm:py-9">
            <RowHead
              title={`${comparison.title} — შეადარე მაღაზიებში`}
              meta={`${comparison.maxShops} მაღაზია ადარებს ერთსა და იმავე პროდუქტს`}
              href={`/categories/${comparison.slug}`}
              action="ყველა პროდუქტი"
            />
            <Rail products={comparison.products.slice(0, RAIL_SIZE)} />
          </div>
        </section>
      )}

      {/* ── 8. Trust block — bottom of the page, three compact items ── */}
      <section>
        <div className="shell py-8 sm:py-10">
          <h2 className="font-display mb-4 text-[17px] font-bold text-[var(--brand)]">რატომ ფასმეტრი</h2>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <TrustItem
              icon={ShieldCheck}
              href="/about"
              title="ფასები ყოველდღე ახლდება"
              text="კატალოგი ამოწმებს ფასს, მარაგს და რეალურ ფასდაკლებას."
            />
            <TrustItem
              icon={Store}
              href="/shops"
              title="ერთი ძებნა, ბევრი მაღაზია"
              text={`${(stats.shops ?? 0).toLocaleString()} ქართული მაღაზია ერთ შედარებად კატალოგში.`}
            />
            <TrustItem
              icon={TrendingDown}
              href="/price-index"
              title="ფასების ისტორია"
              text="ყველაზე დაბალი ფასი და ფასის დინამიკა ერთი მზერით."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Presentation ─────────────────────────────────────────

// One h2 per section, no eyebrow line, no h2 per tile or card.
function RowHead({
  title,
  meta,
  href,
  action,
}: {
  title: string;
  meta?: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display truncate text-[18px] font-bold text-[var(--brand)] sm:text-[22px]">{title}</h2>
        {meta && <p className="mt-0.5 truncate text-[12px] text-[var(--muted)]">{meta}</p>}
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
      >
        {action}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

// Rails, never grids: the page stays short vertically and the same markup
// serves desktop and mobile (CSS handles snap + card width).
function Rail({ products, priority = false }: { products: ProductView[]; priority?: boolean }) {
  return (
    <div className="home-rail">
      {products.map((product, index) => (
        <RailCard key={product.id} product={product} priority={priority && index < 2} />
      ))}
    </div>
  );
}

// A deliberately thin card: the full ProductCard also carries the outbound
// click tracker, a spec line and two footer buttons, and every one of those
// props is serialised again into the RSC flight payload. On a rail the visitor
// is scanning image / name / price / shop count, so that is all this renders
// — but compare and favorite are features, not chrome, so they stay. They are
// siblings of the <Link> (a <button> may not nest inside an <a>) inside a
// position:relative shell, exactly as on ProductCard, and each isolates itself
// from the card's navigation with preventDefault + stopPropagation.
function RailCard({ product, priority }: { product: ProductView; priority: boolean }) {
  const offer = product.offers[0];
  if (!offer) return null;
  const discount = realDiscountPercent(offer);
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;
  const image = offer.imageUrl ?? product.imageUrl;

  return (
    <article className="home-card">
      {/* Same snapshot fields ProductCard sends, so a product favourited from
          the homepage is indistinguishable from one favourited on /search. */}
      <CardToggles
        slug={product.slug}
        name={product.name}
        price={offer.currentPrice}
        oldPrice={offer.oldPrice}
        imageUrl={image}
        shopName={offer.shop.name}
        shopCount={shopCount}
        categorySlug={product.category?.slug}
      />
      <Link href={`/products/${product.slug}`} className="home-card-link">
        <div className="home-card-media">
          <ProductImage
            src={image}
            alt={product.name}
            categorySlug={product.category?.slug}
            shopName={offer.shop.name}
            fixedWidth={220}
            priority={priority}
          />
          {discount > 0 && <span className="home-card-off">-{discount}%</span>}
        </div>
        <div className="home-card-body">
          <span className="home-card-name">{product.name}</span>
          <span className="home-card-price">
            {formatGel(offer.currentPrice)}
            {offer.oldPrice && offer.oldPrice > offer.currentPrice && (
              <span className="home-card-was">{formatGel(offer.oldPrice)}</span>
            )}
          </span>
          <span className="home-card-meta">
            {shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : offer.shop.name}
          </span>
        </div>
      </Link>
    </article>
  );
}

function PromoBanner({ product }: { product: ProductView }) {
  const shopCount = new Set(product.offers.map((offer) => offer.shop.id)).size;
  const discount = Math.max(0, ...product.offers.map((offer) => realDiscountPercent(offer)));
  const price = lowestPrice(product);
  const badge = discount > 0 ? `-${discount}%` : shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)] p-3.5 sm:gap-5 sm:p-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--accent)] sm:size-14">
        {categoryIcon(product.category?.slug ?? "", "lg")}
      </span>
      <span className="min-w-0 flex-1">
        {badge && (
          <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold text-[var(--accent)]">
            {badge}
          </span>
        )}
        {/* A product name is a poor document heading, so the promo's h2 is the
            slot label (screen-reader only) and the name stays a paragraph. */}
        <p className="font-display mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-[var(--brand)] sm:text-[19px]">
          {product.name}
        </p>
        {price > 0 && (
          <span className="text-[12.5px] font-semibold text-[var(--muted-strong)]">{formatGel(price)}-დან</span>
        )}
      </span>
      <ArrowUpRight className="size-5 shrink-0 text-[var(--accent)]" />
    </Link>
  );
}

function TrustItem({
  icon: Icon,
  href,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-white p-3.5 hover:border-[var(--accent)]"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" strokeWidth={2.25} />
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-[var(--brand)]">{title}</span>
        <span className="mt-0.5 block text-[11.5px] leading-5 text-[var(--muted)]">{text}</span>
      </span>
    </Link>
  );
}

// ── Selection (unchanged contract: everything is derived from the catalog) ──

function selectHomeDeals(categoryPools: HomeProduct[][]) {
  // Best real discounts per category, then interleaved so the section always
  // shows top sales from every category and store that has any.
  const rankedPools = categoryPools.map((pool) =>
    filterCuratedProducts(pool, {
      categoryScope: "public",
      requireImage: true,
      requireUsefulCategory: true,
      inStockOnly: true,
    })
      .filter((product) => bestRealDiscount(product) > 0)
      .sort((left, right) => bestRealDiscount(right) - bestRealDiscount(left) || compareDealPriority(left, right)),
  );
  // Lead with the single strongest discount overall.
  rankedPools.sort((left, right) => bestRealDiscount(right[0] ?? emptyDeal) - bestRealDiscount(left[0] ?? emptyDeal));
  // One more than the rail holds, so the promo slot has a distinct candidate.
  return interleaveBalanced(rankedPools, RAIL_SIZE + 2, 4);
}

const emptyDeal = { offers: [] } as unknown as HomeProduct;

function selectFrequentlyCompared(categoryPools: HomeProduct[][], promotedKeys: Set<string>) {
  const rankedPools = categoryPools.map((pool) => {
    const multiStore = filterCuratedProducts(pool, {
      categoryScope: "public",
      requireImage: true,
      requireUsefulCategory: true,
      requireDiscoveryQuality: true,
    })
      .filter((product) => uniqueShopCount(product) >= 2)
      .sort((left, right) => uniqueShopCount(right) - uniqueShopCount(left) || compareProductPriority(left, right));
    const fallback = filterCuratedProducts(pool, {
      categoryScope: "public",
      requireImage: true,
      requireUsefulCategory: true,
      inStockOnly: true,
    }).sort(compareProductPriority);
    const merged = dedupeHomepageProducts([...multiStore, ...fallback]);
    const preferred = merged.filter((product) => !homepageDedupKeys(product).some((key) => promotedKeys.has(key)));
    const promotedFallback = merged.filter((product) => homepageDedupKeys(product).some((key) => promotedKeys.has(key)));
    return [...preferred, ...promotedFallback];
  });
  return interleaveBalanced(rankedPools, RAIL_SIZE, 5);
}

// "Best cross-shop comparison": whichever public category currently has the
// deepest multi-shop coverage wins the section, and the heading is built from
// that category's own name. Nothing here is pinned to a slug or a product.
function selectComparisonSpotlight(slugs: string[], categoryPools: HomeProduct[][], categories: CategoryView[]) {
  const groups = slugs
    .map((slug, index) => {
      const products = dedupeHomepageProducts(
        filterCuratedProducts(categoryPools[index] ?? [], { categoryScope: "public", requireImage: true })
          .filter((product) => uniqueShopCount(product) >= 2)
          .sort((left, right) => uniqueShopCount(right) - uniqueShopCount(left) || compareProductPriority(left, right)),
      ).slice(0, RAIL_SIZE);
      const category = categories.find((entry) => entry.slug === slug) ?? null;
      return {
        slug,
        title: category?.nameKa ?? slug,
        products,
        maxShops: Math.max(0, ...products.map(uniqueShopCount)),
        // Total comparison depth: every extra shop on a product is one more
        // price the visitor can weigh up.
        coverage: products.reduce((total, product) => total + (uniqueShopCount(product) - 1), 0),
      };
    })
    .filter((group) => group.products.length > 0)
    .sort((left, right) => right.coverage - left.coverage || right.maxShops - left.maxShops);

  return groups[0] ?? null;
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

function lowestPrice(product: ProductView) {
  const prices = product.offers.map((offer) => offer.currentPrice).filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : 0;
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
    .replace(/[^a-z0-9Ⴀ-ჿᲐ-Ჿ]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}
