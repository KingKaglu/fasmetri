import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  ChevronDown,
  Clock3,
  MousePointerClick,
  Scale,
  Search,
  ShieldCheck,
  Store,
  TrendingDown,
} from "lucide-react";
import {
  getCatalogStats,
  listPopularBrands,
  listPublicCategories,
  listPublicProducts,
  listPublicShops,
  listRecentPriceChanges,
} from "@/lib/catalog";
import { CategoryView, ProductView } from "@/lib/catalog-types";
import { formatGel, formatRelativeTime, formatRelativeUpdated } from "@/lib/format";
import { popularSearchTerms } from "@/lib/popular-searches";
import { CardToggles } from "@/components/card-toggles";
import { categoryIcon } from "@/components/category-card";
import { JsonLd } from "@/components/json-ld";
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
    "Fasmetri.ge — შეადარე ტელეფონების, ლეპტოპების, ტელევიზორების და ტექნიკის ფასები ქართულ ონლაინ მაღაზიებში. იპოვე სად არის ყველაზე იაფი და ყიდვამდე გადაამოწმე ფასი ოფიციალურ გვერდზე.",
  alternates: { canonical: "/" },
};

export const revalidate = 600;

type HomeProduct = Awaited<ReturnType<typeof listPublicProducts>>[number];

// Density budget. The homepage has two jobs: say in one screen what Fasmetri
// is (one search, every Georgian store, the cheapest price), and put enough of
// the live catalog in front of the visitor that the claim is visibly true.
// Product rows are still horizontal rails, so adding rows adds height, never a
// wall of grid. These caps are counts, not identities — WHICH categories and
// products fill them is decided by the live catalog on every revalidate.
const CATEGORY_TILES = 12; // 6×2 desktop; CSS hides the last 4 below 480px (8 = 2×4)
const RAIL_SIZE = 12; // a phone rail shows ~2.2 cards; desktop shows ~6 per screen
const CATEGORY_RAILS = 6; // the largest public categories each get their own rail
const CATEGORY_RAIL_MIN = 4; // a rail with fewer cards than this is not worth a section
// A cross-shop spread above this ratio is almost always two different variants
// that were matched together, not a real saving, so it is kept off the page.
const MAX_CREDIBLE_SPREAD = 0.55;

// Until SearchQuery has enough traffic, the hero chips fall back to these.
const FALLBACK_SEARCHES = ["iPhone 16", "Samsung Galaxy", "MacBook Air", "PlayStation 5", "AirPods", "ტელევიზორი"];

const FAQ: { q: string; a: string }[] = [
  {
    q: "რა არის ფასმეტრი?",
    a: "ფასმეტრი დამოუკიდებელი ფასების შედარების პლატფორმაა. ერთსა და იმავე პროდუქტს ქართულ ონლაინ მაღაზიებში ვპოულობთ და მის ფასებს ერთ გვერდზე ვადარებთ, რომ ერთი ძებნით ნახო, სად ღირს ყველაზე იაფი.",
  },
  {
    q: "რამდენად ზუსტია ფასები?",
    a: "ფასს, ძველ ფასს და მარაგს მაღაზიების საჯარო გვერდებიდან რეგულარულად ვამოწმებთ და ყველა ფასთან ჩანს, როდის განახლდა. მაღაზიამ ფასი ნებისმიერ დროს შეიძლება შეცვალოს, ამიტომ ყიდვამდე საბოლოო ფასი მაღაზიის გვერდზე გადაამოწმე.",
  },
  {
    q: "შემიძლია ფასმეტრზე ყიდვა?",
    a: "არა — ფასმეტრი არაფერს ყიდის. ღილაკი „ნახვა“ პირდაპირ მაღაზიის ოფიციალურ გვერდზე გადაგიყვანს, სადაც ყიდვა ჩვეულებრივად ხდება.",
  },
  {
    q: "რას ნიშნავს „ნამდვილი ფასდაკლება“?",
    a: "ფასდაკლებად მხოლოდ იმ შეთავაზებას ვთვლით, სადაც ძველი ფასი მაღაზიის გვერდზე ფიქსირდება და მიმდინარე ფასზე მაღალია. პროდუქტის გვერდზე ფასის ისტორიაც ჩანს, ასე რომ „გაბერილ“ ფასდაკლებას მარტივად ამოიცნობ.",
  },
  {
    q: "როგორ გავიგო, როცა ფასი დაიკლებს?",
    a: "პროდუქტის გვერდზე ჩართე ფასის შეტყობინება — როცა ფასი შენს მითითებულ ზღვარს ჩამოსცდება, შეგატყობინებთ.",
  },
  {
    q: "ფასმეტრით სარგებლობა ფასიანია?",
    a: "არა, ფასმეტრი სრულიად უფასოა და რეგისტრაციას არ მოითხოვს.",
  },
];

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
  // instead of whatever a single global sort happens to surface. Everything
  // else here reads a cross-request cache (unstable_cache, "catalog" tag), so
  // the extra sections cost no additional per-request database work.
  const [categoryDeals, categoryPopular, stats, shops, searches, brands, priceChanges] = await Promise.all([
    Promise.all(
      poolSlugs.map((category) => listPublicProducts({ category, dealsOnly: true, sort: "discount", pageSize: 60 })),
    ),
    Promise.all(poolSlugs.map((category) => listPublicProducts({ category, sort: "priority", pageSize: 80 }))),
    getCatalogStats(),
    listPublicShops().catch(() => []),
    popularSearchTerms(FALLBACK_SEARCHES, 6),
    listPopularBrands(14),
    listRecentPriceChanges(),
  ]);

  // Biggest cross-shop spreads first: this is the site's whole promise ("the
  // same product is cheaper over there") made concrete with live numbers.
  const savings = selectBiggestSavings(categoryPopular);
  const savingsRail = savings.slice(0, RAIL_SIZE);
  // The hero shows one product's shop-by-shop price list. Prefer the widest
  // comparison (most shops), then the biggest spread.
  const heroCompare =
    [...savings.slice(0, 20)].sort(
      (left, right) => uniqueShopCount(right) - uniqueShopCount(left) || priceSpread(right) - priceSpread(left),
    )[0] ?? null;

  const savingsKeys = new Set(savingsRail.flatMap(homepageDedupKeys));
  const discounts = selectHomeDeals(categoryDeals, savingsKeys);
  const dealRail = discounts.slice(0, RAIL_SIZE);

  // Per-category rails for the largest categories. Each rail prefers products
  // the sections above did not already show, so scrolling keeps revealing new
  // products instead of repeating the same dozen.
  const shownKeys = new Set([...savingsKeys, ...dealRail.flatMap(homepageDedupKeys)]);
  const categoryRails = selectCategoryRails(poolSlugs, categoryPopular, categories, shownKeys);

  const categoryTiles = categories.slice(0, CATEGORY_TILES);
  const latestUpdate = stats.latestUpdate;

  return (
    <div className="min-h-screen">
      <JsonLd data={faqJsonLd()} />

      {/* ── 1. Hero: what Fasmetri is, the search, and a live comparison ── */}
      <section className="home-hero">
        <div className="shell grid items-center gap-7 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-10">
          <div className="min-w-0">
            {latestUpdate && (
              <p className="home-live">
                <span className="home-live-dot" aria-hidden />
                ფასები {formatRelativeUpdated(latestUpdate)}
              </p>
            )}
            <h1 className="font-display mt-3 max-w-3xl text-[30px] font-bold leading-[1.12] text-[var(--brand)] sm:text-[44px]">
              შეადარე ფასები და იყიდე <span className="text-[var(--accent)]">იაფად</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[var(--muted-strong)] sm:text-[16px] sm:leading-7">
              ფასმეტრი ერთ ადგილას აგროვებს {(stats.shops ?? 0).toLocaleString()} ქართული ონლაინ მაღაზიის ფასებს —
              ტელეფონები, ლეპტოპები, ტელევიზორები და ტექნიკა. ერთი ძებნით ნახავ, სად ღირს ყველაზე იაფი.
            </p>
            <div className="mt-5 max-w-2xl">
              <SearchBar large />
            </div>
            {searches.length > 0 && (
              <nav className="home-chips" aria-label="პოპულარული ძიებები">
                <span className="mr-1 shrink-0 text-[12px] font-medium text-[var(--muted)]">ხშირად ეძებენ:</span>
                {searches.map((term) => (
                  <Link key={term} href={`/search?q=${encodeURIComponent(term)}`} className="home-chip">
                    {term}
                  </Link>
                ))}
              </nav>
            )}
            <dl className="home-stats">
              <HeroStat value={stats.products} label="პროდუქტი" />
              <HeroStat value={stats.shops} label="მაღაზია" />
              <HeroStat value={stats.totalOffers} label="ფასი შედარებაში" />
              <HeroStat value={stats.deals} label="აქტიური ფასდაკლება" />
            </dl>
          </div>
          {heroCompare && <HeroCompare product={heroCompare} />}
        </div>
      </section>

      {/* ── 2. Which stores are compared — the claim, named ── */}
      {shops.length > 0 && (
        <section className="border-b border-[var(--line)] bg-white">
          <div className="shell flex items-center gap-3 overflow-x-auto py-3.5 [scrollbar-width:none]">
            <span className="shrink-0 text-[12px] font-semibold text-[var(--muted)]">ვადარებთ:</span>
            {shops.map((shop) => (
              <Link key={shop.id} href={`/shops/${shop.slug}`} className="home-shop">
                <Store className="size-3.5 text-[var(--accent)]" aria-hidden />
                {shop.name}
                {shop.productCount ? <span className="home-shop-count">{shop.productCount.toLocaleString()}</span> : null}
              </Link>
            ))}
            <Link href="/shops" className="home-shop-all">
              ყველა მაღაზია
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ── 3. How it works — three steps, one line each ── */}
      <section className="home-section border-b border-[var(--line)]">
        <div className="shell py-7 sm:py-9">
          <h2 className="font-display mb-4 text-[18px] font-bold text-[var(--brand)] sm:text-[22px]">როგორ მუშაობს ფასმეტრი</h2>
          <ol className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <Step n={1} icon={Search} title="მოძებნე" text="ჩაწერე მოდელი ან აირჩიე კატეგორია — ძებნა ქართულადაც და ლათინურადაც მუშაობს." />
            <Step n={2} icon={Scale} title="შეადარე" text="ერთი და იგივე პროდუქტის ფასი ყველა მაღაზიაში, მარაგი და ფასის ისტორია ერთ გვერდზე." />
            <Step n={3} icon={MousePointerClick} title="იყიდე იაფად" text="ერთი დაჭერით გადადი იმ მაღაზიაში, სადაც ყველაზე იაფია, და იქვე შეიძინე." />
          </ol>
        </div>
      </section>

      {/* ── 4. Category band — navigation, one h2 for the whole band ── */}
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
                  <span className="min-w-0">
                    <span className="cat-name">{category.nameKa}</span>
                    {category.productCount ? (
                      <span className="cat-count">{category.productCount.toLocaleString()} პროდუქტი</span>
                    ) : null}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      )}

      {/* Recently viewed — client-only, renders nothing until there is history */}
      <RecentlyViewedStrip />

      {/* ── 5. Biggest price gaps between shops — the core value ── */}
      {savingsRail.length > 0 && (
        <section className="border-b border-[var(--line)]">
          <div className="shell py-7 sm:py-9">
            <RowHead
              title="სად არის იაფი — ფასის სხვაობა მაღაზიებს შორის"
              meta="ერთი და იგივე პროდუქტი, სხვადასხვა ფასი. აქ ყველაზე დიდი სხვაობებია."
              href="/search?sort=priority"
              action="ყველა"
            />
            <Rail products={savingsRail} priority showSavings />
          </div>
        </section>
      )}

      {/* ── 6. Deals rail ─────────────────────────────────────── */}
      {dealRail.length > 0 && (
        <section className="home-section border-b border-[var(--line)] bg-white">
          <div className="shell py-7 sm:py-9">
            <RowHead
              title="დღის საუკეთესო ფასდაკლებები"
              meta={stats.deals ? `${stats.deals.toLocaleString()} ნამდვილი ფასდაკლება — ძველი ფასი დადასტურებულია` : undefined}
              href="/deals"
              action="ყველა აქცია"
            />
            <Rail products={dealRail} priority={savingsRail.length === 0} />
          </div>
        </section>
      )}

      {/* ── 7. One rail per large category ───────────────────── */}
      {categoryRails.map((rail, index) => (
        <section
          key={rail.slug}
          className={`home-section border-b border-[var(--line)] ${index % 2 === 1 ? "bg-white" : ""}`}
        >
          <div className="shell py-7 sm:py-9">
            <RowHead
              title={rail.title}
              meta={railMeta(rail.category)}
              href={`/categories/${rail.slug}`}
              action="ყველა"
              icon={categoryIcon(rail.slug)}
            />
            <Rail products={rail.products} />
          </div>
        </section>
      ))}

      {/* ── 8. Live price movements + brands ─────────────────── */}
      {(priceChanges.length > 0 || brands.length > 0) && (
        <section className="home-section border-b border-[var(--line)]">
          <div className="shell grid gap-8 py-7 sm:py-9 lg:grid-cols-2">
            {priceChanges.length > 0 && (
              <div className="min-w-0">
                <h2 className="font-display mb-1 text-[18px] font-bold text-[var(--brand)] sm:text-[22px]">ფასი ახლახან შეიცვალა</h2>
                <p className="mb-3.5 text-[12px] text-[var(--muted)]">ბოლო ცვლილებები კატალოგში — ფასები მუდმივად მოწმდება.</p>
                <ul className="home-changes">
                  {priceChanges.map((change) => (
                    <PriceChangeRow key={change.offerId} change={change} />
                  ))}
                </ul>
              </div>
            )}
            {brands.length > 0 && (
              <div className="min-w-0">
                <h2 className="font-display mb-1 text-[18px] font-bold text-[var(--brand)] sm:text-[22px]">პოპულარული ბრენდები</h2>
                <p className="mb-3.5 text-[12px] text-[var(--muted)]">შეადარე ფასები ბრენდის მიხედვით.</p>
                <nav className="flex flex-wrap gap-2" aria-label="ბრენდები">
                  {brands.map((brand) => (
                    <Link key={brand.name} href={`/search?q=${encodeURIComponent(brand.name)}`} className="home-brand">
                      {brand.name}
                      <span className="home-shop-count">{brand.productCount.toLocaleString()}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 9. Trust + FAQ ───────────────────────────────────── */}
      <section className="home-section">
        <div className="shell grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="min-w-0">
            <h2 className="font-display mb-4 text-[18px] font-bold text-[var(--brand)] sm:text-[22px]">რატომ ფასმეტრი</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <TrustItem
                icon={Clock3}
                href="/about"
                title="ფასები ყოველდღე ახლდება"
                text="ფასს, მარაგს და ძველ ფასს რეგულარულად ვამოწმებთ — ყველა ფასთან ჩანს, როდის განახლდა."
              />
              <TrustItem
                icon={Store}
                href="/shops"
                title="ერთი ძებნა, ყველა მაღაზია"
                text={`${(stats.shops ?? 0).toLocaleString()} ქართული მაღაზია ერთ შედარებად კატალოგში.`}
              />
              <TrustItem
                icon={BadgeCheck}
                href="/deals"
                title="მხოლოდ ნამდვილი ფასდაკლება"
                text="ფასდაკლებას ვაჩვენებთ მხოლოდ მაშინ, როცა ძველი ფასი დადასტურებულია."
              />
              <TrustItem
                icon={TrendingDown}
                href="/price-index"
                title="ფასის ისტორია"
                text="ნახე, როგორ იცვლებოდა ფასი, და იყიდე სწორ დროს."
              />
              <TrustItem
                icon={BellRing}
                href="/about"
                title="ფასის შეტყობინება"
                text="გამოიწერე პროდუქტი და გაიგებ, როცა ფასი დაიკლებს."
              />
              <TrustItem
                icon={ShieldCheck}
                href="/about"
                title="დამოუკიდებელი და უფასო"
                text="ფასმეტრი არაფერს ყიდის — ყიდვა ხდება პირდაპირ მაღაზიის ოფიციალურ გვერდზე."
              />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="font-display mb-4 text-[18px] font-bold text-[var(--brand)] sm:text-[22px]">ხშირად დასმული კითხვები</h2>
            <div className="home-faq">
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>
                    {item.q}
                    <ChevronDown className="size-4 shrink-0 text-[var(--muted)]" aria-hidden />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Presentation ─────────────────────────────────────────

function HeroStat({ value, label }: { value?: number | null; label: string }) {
  if (!value) return null;
  return (
    <div className="home-stat">
      <dt className="truncate text-[10.5px] font-medium text-[var(--muted)] sm:text-[11.5px]">{label}</dt>
      <dd className="font-display text-[17px] font-bold tabular-nums text-[var(--brand)] sm:text-[24px]">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

// The hero's right column: one real product, every shop's price for it, the
// cheapest one marked. It is the product explained by example — no stock art.
function HeroCompare({ product }: { product: ProductView }) {
  const offers = cheapestOfferPerShop(product).slice(0, 5);
  if (offers.length < 2) return null;
  const low = offers[0].currentPrice;
  const high = Math.max(...offers.map((offer) => offer.currentPrice));

  return (
    <Link href={`/products/${product.slug}`} className="home-compare" aria-label={`${product.name} — ფასების შედარება`}>
      <span className="home-compare-kicker">
        <Scale className="size-3.5" aria-hidden />
        ცოცხალი შედარება
      </span>
      <span className="home-compare-name">{product.name}</span>
      <ul className="home-compare-list">
        {offers.map((offer, index) => (
          <li key={offer.id} data-best={index === 0 || undefined}>
            <span className="truncate">{offer.shop.name}</span>
            {index === 0 && <span className="home-compare-best">ყველაზე იაფი</span>}
            <span className="home-compare-price">{formatGel(offer.currentPrice)}</span>
          </li>
        ))}
      </ul>
      {high > low && (
        <span className="home-compare-save">
          <TrendingDown className="size-4" aria-hidden />
          დაზოგე {formatGel(high - low)} ერთი შედარებით
        </span>
      )}
      <span className="home-compare-cta">
        ყველა ფასის ნახვა
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}

function Step({ n, icon: Icon, title, text }: { n: number; icon: typeof Search; title: string; text: string }) {
  return (
    <li className="home-step">
      <span className="home-step-ico">
        <Icon className="size-4.5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold text-[var(--brand)]">
          <span className="text-[var(--accent)]">{n}.</span> {title}
        </span>
        <span className="mt-0.5 hidden text-[12.5px] leading-5 text-[var(--muted)] sm:block">{text}</span>
      </span>
    </li>
  );
}

// One h2 per section, no eyebrow line, no h2 per tile or card.
function RowHead({
  title,
  meta,
  href,
  action,
  icon,
}: {
  title: string;
  meta?: string;
  href: string;
  action: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="cat-ico hidden sm:grid">{icon}</span>}
        <div className="min-w-0">
          <h2 className="font-display text-[18px] font-bold leading-tight text-[var(--brand)] sm:text-[22px]">{title}</h2>
          {meta && <p className="mt-0.5 text-[12px] text-[var(--muted)]">{meta}</p>}
        </div>
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
function Rail({
  products,
  priority = false,
  showSavings = false,
}: {
  products: ProductView[];
  priority?: boolean;
  showSavings?: boolean;
}) {
  return (
    <div className="home-rail">
      {products.map((product, index) => (
        <RailCard key={product.id} product={product} priority={priority && index < 2} showSavings={showSavings} />
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
function RailCard({ product, priority, showSavings }: { product: ProductView; priority: boolean; showSavings: boolean }) {
  const offer = product.offers[0];
  if (!offer) return null;
  const discount = realDiscountPercent(offer);
  const shopCount = uniqueShopCount(product);
  const image = offer.imageUrl ?? product.imageUrl;
  const spread = showSavings ? priceSpread(product) : 0;

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
            {shopCount > 1 && <span className="home-card-from">საუკეთესო ფასი</span>}
            {formatGel(offer.currentPrice)}
            {offer.oldPrice && offer.oldPrice > offer.currentPrice && (
              <span className="home-card-was">{formatGel(offer.oldPrice)}</span>
            )}
          </span>
          {spread > 0 && <span className="home-card-save">დაზოგე {formatGel(spread)}</span>}
          <span className="home-card-meta" data-multi={shopCount > 1 || undefined}>
            {shopCount > 1 ? `${shopCount} მაღაზია ადარებს` : offer.shop.name}
          </span>
        </div>
      </Link>
    </article>
  );
}

function PriceChangeRow({ change }: { change: Awaited<ReturnType<typeof listRecentPriceChanges>>[number] }) {
  const previous = change.previousPrice ?? change.currentPrice;
  const dropped = change.currentPrice < previous;
  const delta = Math.abs(previous - change.currentPrice);
  const Icon = dropped ? ArrowDownRight : ArrowUpRight;
  return (
    <li>
      <Link href={`/products/${change.productSlug}`} className="home-change">
        <span className={`home-change-ico ${dropped ? "is-down" : "is-up"}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-[var(--brand)]">{change.productName}</span>
          <span className="block truncate text-[11.5px] text-[var(--muted)]">
            {change.shopName} · {formatRelativeTime(change.changedAt)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13.5px] font-bold tabular-nums text-[var(--brand)]">{formatGel(change.currentPrice)}</span>
          <span className={`block text-[11px] font-semibold tabular-nums ${dropped ? "text-[var(--savings)]" : "text-[var(--price-deal)]"}`}>
            {dropped ? "−" : "+"}
            {formatGel(delta)}
          </span>
        </span>
      </Link>
    </li>
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

function railMeta(category: CategoryView | null) {
  if (!category?.productCount) return undefined;
  const parts = [`${category.productCount.toLocaleString()} პროდუქტი`];
  if (category.dealCount) parts.push(`${category.dealCount.toLocaleString()} ფასდაკლება`);
  return parts.join(" · ");
}

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// ── Selection (unchanged contract: everything is derived from the catalog) ──

function selectHomeDeals(categoryPools: HomeProduct[][], excludedKeys: Set<string>) {
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
      .filter((product) => !homepageDedupKeys(product).some((key) => excludedKeys.has(key)))
      .sort((left, right) => bestRealDiscount(right) - bestRealDiscount(left) || compareDealPriority(left, right)),
  );
  // Lead with the single strongest discount overall.
  rankedPools.sort((left, right) => bestRealDiscount(right[0] ?? emptyDeal) - bestRealDiscount(left[0] ?? emptyDeal));
  return interleaveBalanced(rankedPools, RAIL_SIZE, 4);
}

const emptyDeal = { offers: [] } as unknown as HomeProduct;

// "Where is it cheaper": products sold by at least two shops, ranked by how
// much the visitor saves by buying at the cheapest one instead of the dearest.
// Round-robined across categories so one expensive category (TVs, laptops)
// cannot own the whole row just because its absolute gaps are larger.
function selectBiggestSavings(categoryPools: HomeProduct[][]) {
  const rankedPools = categoryPools.map((pool) =>
    filterCuratedProducts(pool, {
      categoryScope: "public",
      requireImage: true,
      requireUsefulCategory: true,
      inStockOnly: true,
    })
      .filter((product) => uniqueShopCount(product) >= 2 && priceSpread(product) > 0 && isCredibleSpread(product))
      .sort((left, right) => priceSpread(right) - priceSpread(left) || compareProductPriority(left, right)),
  );
  rankedPools.sort((left, right) => priceSpread(right[0] ?? emptyDeal) - priceSpread(left[0] ?? emptyDeal));
  return interleaveBalanced(rankedPools, RAIL_SIZE + 8, 5);
}

// One rail per large public category, filled from the category's own priority
// pool. Products the page already showed go to the back of the queue, not out
// of it, so a small category still fills its rail.
function selectCategoryRails(
  slugs: string[],
  categoryPools: HomeProduct[][],
  categories: CategoryView[],
  shownKeys: Set<string>,
) {
  const rails: { slug: string; title: string; category: CategoryView | null; products: HomeProduct[] }[] = [];
  // Largest categories first — the same order as the category band.
  const ordered = categories.length ? categories.map((category) => category.slug) : slugs;

  for (const slug of ordered) {
    if (rails.length >= CATEGORY_RAILS) break;
    const pool = categoryPools[slugs.indexOf(slug)];
    if (!pool) continue;
    const ranked = dedupeHomepageProducts(
      filterCuratedProducts(pool, {
        categoryScope: "public",
        requireImage: true,
        requireUsefulCategory: true,
      }).sort(
        (left, right) =>
          Number(hasStock(right)) - Number(hasStock(left)) ||
          Number(uniqueShopCount(right) > 1) - Number(uniqueShopCount(left) > 1) ||
          compareProductPriority(left, right),
      ),
    );
    const fresh = ranked.filter((product) => !homepageDedupKeys(product).some((key) => shownKeys.has(key)));
    const repeat = ranked.filter((product) => homepageDedupKeys(product).some((key) => shownKeys.has(key)));
    const products = [...fresh, ...repeat].slice(0, RAIL_SIZE);
    if (products.length < CATEGORY_RAIL_MIN) continue;
    for (const product of products) for (const key of homepageDedupKeys(product)) shownKeys.add(key);
    const category = categories.find((entry) => entry.slug === slug) ?? null;
    rails.push({ slug, title: category?.nameKa ?? slug, category, products });
  }

  return rails;
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

// The cheapest buyable offer from each shop, cheapest shop first. A shop can
// list the same product twice (colour variants), which must not count as two
// shops.
function cheapestOfferPerShop(product: ProductView) {
  const byShop = new Map<string, ProductView["offers"][number]>();
  for (const offer of product.offers) {
    // A price nobody can buy at is not a saving to advertise.
    if (!(offer.currentPrice > 0) || offer.availability === "OUT_OF_STOCK") continue;
    const current = byShop.get(offer.shop.id);
    if (!current || offer.currentPrice < current.currentPrice) byShop.set(offer.shop.id, offer);
  }
  return [...byShop.values()].sort((left, right) => left.currentPrice - right.currentPrice);
}

// What buying at the cheapest shop saves against the dearest one.
function priceSpread(product: ProductView) {
  const offers = cheapestOfferPerShop(product);
  if (offers.length < 2) return 0;
  return Math.round(offers[offers.length - 1].currentPrice - offers[0].currentPrice);
}

function isCredibleSpread(product: ProductView) {
  const offers = cheapestOfferPerShop(product);
  const high = offers[offers.length - 1]?.currentPrice ?? 0;
  return high > 0 && priceSpread(product) / high <= MAX_CREDIBLE_SPREAD;
}

function hasStock(product: ProductView) {
  return product.offers.some((offer) => offer.availability === "IN_STOCK");
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
