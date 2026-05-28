import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  ChevronRight,
  Cpu,
  Flame,
  Headphones,
  Laptop,
  MonitorSmartphone,
  Scale,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  TrendingDown,
  Tv,
  Watch,
  Zap,
} from "lucide-react";
import { getCatalogStats, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { ProductMarquee } from "@/components/product-marquee";
import { SearchBar } from "@/components/search-bar";
import { ShopCard } from "@/components/shop-card";
import {
  AvailabilityBadge,
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
export const dynamic = "force-dynamic";

const CATEGORIES = [
  { href: "/categories/mobiles",           label: "მობილურები",    icon: Smartphone,       color: "bg-blue-50 text-blue-600",    glow: "hover:shadow-[0_8px_28px_rgba(37,99,235,.18)]" },
  { href: "/categories/laptops",           label: "ლეპტოპები",     icon: Laptop,           color: "bg-violet-50 text-violet-600", glow: "hover:shadow-[0_8px_28px_rgba(124,58,237,.18)]" },
  { href: "/categories/televisions",       label: "ტელევიზორები",  icon: Tv,               color: "bg-sky-50 text-sky-600",       glow: "hover:shadow-[0_8px_28px_rgba(14,165,233,.18)]" },
  { href: "/categories/audio",             label: "აუდიო",         icon: Headphones,       color: "bg-pink-50 text-pink-600",     glow: "hover:shadow-[0_8px_28px_rgba(219,39,119,.18)]" },
  { href: "/categories/wearables",         label: "სმარტ საათები", icon: Watch,            color: "bg-emerald-50 text-emerald-600", glow: "hover:shadow-[0_8px_28px_rgba(16,185,129,.18)]" },
  { href: "/categories/gaming",            label: "გეიმინგი",      icon: Cpu,              color: "bg-orange-50 text-orange-600", glow: "hover:shadow-[0_8px_28px_rgba(249,115,22,.18)]" },
  { href: "/categories/phone-accessories", label: "ექსესუარები",   icon: MonitorSmartphone, color: "bg-indigo-50 text-indigo-600", glow: "hover:shadow-[0_8px_28px_rgba(99,102,241,.18)]" },
  { href: "/search",                       label: "სხვა",          icon: Search,           color: "bg-slate-50 text-slate-500",   glow: "hover:shadow-[0_8px_28px_rgba(100,116,139,.14)]" },
];

export default async function Home() {
  const [discoveryCandidates, shops, stats] = await Promise.all([
    listPublicProducts({ categorySlugs: PRIORITY_CATEGORIES, sort: "priority", pageSize: 200, candidateLimit: 240 }),
    listPublicShops(),
    getCatalogStats(),
  ]);
  const activeShops = shops
    .filter((shop) => (shop.productCount ?? 0) > 0)
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));
  const discounts = selectHomeDeals(
    discoveryCandidates.filter((p) => p.offers.some((o) => o.discountPercent > 0)).sort(compareDealPriority),
  );
  const trending = selectHomeDiscovery(discoveryCandidates);

  return (
    <div className="min-h-screen">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-10 pt-14 sm:pb-14 sm:pt-20">
        {/* blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#dbeafe]/70 blur-3xl" />
          <div className="absolute right-0 top-1/2 h-[24rem] w-[24rem] translate-x-1/3 -translate-y-1/2 rounded-full bg-[#fff7ed]/80 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[20rem] w-[20rem] -translate-x-1/4 translate-y-1/3 rounded-full bg-[#ede9fe]/60 blur-3xl" />
        </div>

        <div className="shell flex flex-col items-center text-center">
          {/* eyebrow pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c3d8fc] bg-white/95 px-4 py-2 text-sm font-bold text-[#0054d2] shadow-[0_4px_16px_rgba(0,84,210,.1)] backdrop-blur">
            <Sparkles className="size-4 shrink-0 text-[#ff6800]" />
            ქართული ონლაინ მაღაზიები ერთ ადგილას
          </div>

          {/* headline */}
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-[#0b1a2e] sm:text-5xl xl:text-6xl">
            შეადარე ფასები,
            <span className="block bg-gradient-to-r from-[#0054d2] to-[#7c3aed] bg-clip-text text-transparent">
              დაზოგე ფული
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#4b6280] sm:text-lg">
            იპოვე საუკეთესო ფასი Zoommer-ზე, EE-ზე, PCShop-ზე და სხვა ქართულ მაღაზიებში — ყოველდღე, ერთ ხედში.
          </p>

          {/* search */}
          <div className="mt-8 w-full max-w-2xl">
            <SearchBar large />
          </div>

          {/* stats row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <StatPill value={stats.shops} label="მაღაზია" />
            <StatPill value={stats.products} label="პროდუქტი" />
            <StatPill value={stats.deals} label="აქტიური აქცია" accent />
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ───────────────────────────────────────── */}
      <section className="shell mb-14">
        <SectionLabel>კატეგორიები</SectionLabel>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 md:grid-cols-8">
          {CATEGORIES.map(({ href, label, icon: Icon, color, glow }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col items-center gap-2.5 rounded-2xl border border-[#e8eef7] bg-white p-3 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#c4d7f4] ${glow} sm:p-4`}
            >
              <span className={`grid size-12 place-items-center rounded-xl ${color} transition duration-200 group-hover:scale-110`}>
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] font-black leading-tight text-[#334155] sm:text-xs">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="mb-14 bg-gradient-to-b from-[#f0f5ff] to-white py-10">
        <div className="shell">
          <SectionLabel>როგორ მუშაობს</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-3">
            <HowCard step={1} icon={Search} title="მოძებნე" description="ჩაწერე სახელი ან კატეგორია და ნახე ყველა შეთავაზება" />
            <HowCard step={2} icon={BadgePercent} title="შეადარე" description="ნახე რამდენიმე მაღაზიის ფასები ერთ სუფთა ხედში" accent />
            <HowCard step={3} icon={ShieldCheck} title="იყიდე" description="გადახედე ფასდაკლებებს და ბმულით გადი მაღაზიაში" />
          </div>
        </div>
      </section>

      {/* ─── DEALS ────────────────────────────────────────────── */}
      <section className="shell mb-14">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[#ffe2cc] bg-gradient-to-br from-[#fff8f1] via-white to-[#fff1f4] p-5 shadow-[0_18px_50px_rgba(255,104,0,.08)] sm:p-7">
          {/* warm decorative glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ffd9bd]/40 blur-3xl" />

          {/* header */}
          <div className="relative mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ff7a18] to-[#ff5400] text-white shadow-[0_10px_28px_rgba(255,104,0,.35)]">
                <Flame className="size-6" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#ff6800]">შეთავაზებები</p>
                <h2 className="text-xl font-black leading-tight text-[#0b1a2e] sm:text-2xl">დღის საუკეთესო აქციები</h2>
                <p className="mt-0.5 text-xs font-bold text-[#a06a48] sm:text-sm">ფასები მოწმდება ყოველდღე — დაიჭირე საუკეთესო მომენტი</p>
              </div>
            </div>
            <Link
              href="/deals"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#ff7a18] to-[#ff5400] px-5 py-3 text-sm font-black text-white shadow-[0_8px_22px_rgba(255,104,0,.3)] transition hover:shadow-[0_12px_30px_rgba(255,104,0,.42)]"
            >
              ყველა აქცია
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* featured + grid */}
          {discounts.length ? (
            <div className="relative grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <FeaturedDeal product={discounts[0]} />
              </div>
              <div className="lg:col-span-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              emptyTitle="სასარგებლო აქციები მალე გამოჩნდება"
              emptyDescription="ფასმეტრი პირველ რიგში მაღალმოთხოვნად პროდუქტებზე ახალ ფასდაკლებებს აჩვენებს."
            />
          )}
        </div>
      </section>

      {/* ─── TRENDING ─────────────────────────────────────────── */}
      <section className="shell mb-14">
        <BandHeader
          eyebrow="ტრენდი"
          title="ყველაზე მოთხოვნადი"
          href="/search?sort=priority"
          icon={Sparkles}
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

      {/* ─── TRUST BANNER ─────────────────────────────────────── */}
      <section className="mb-14">
        <div className="shell">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0054d2] to-[#003f9f] p-8 text-white sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="soft-grid h-full w-full" />
            </div>
            <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-200">ფასმეტრი</p>
                <h2 className="mt-1 text-2xl font-black leading-snug sm:text-3xl">
                  ყიდვამდე ყოველთვის<br />გადაამოწმე ფასი
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-blue-100">
                  ფასები იცვლება. ჩვენ ვამოწმებთ რეგულარულად, რომ შენ საუკეთესო დროს იყიდო.
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#0054d2] shadow-[0_8px_24px_rgba(0,0,0,.25)] transition hover:bg-[#eef5ff] hover:shadow-[0_12px_32px_rgba(0,0,0,.3)]"
              >
                ძებნის დაწყება
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STORES ───────────────────────────────────────────── */}
      <section className="shell mb-16">
        <BandHeader eyebrow="მაღაზიები" title="ჩვენი პარტნიორი მაღაზიები" href="/shops" />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {activeShops.slice(0, 3).map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
        {activeShops.length > 3 && (
          <div className="mt-4 text-center">
            <Link href="/shops" className="inline-flex items-center gap-1.5 text-sm font-black text-[#0054d2] hover:underline">
              ყველა მაღაზია <ChevronRight className="size-4" />
            </Link>
          </div>
        )}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-[#e6edf7]" />
      <span className="text-xs font-black uppercase tracking-widest text-[#8097b1]">{children}</span>
      <span className="h-px flex-1 bg-[#e6edf7]" />
    </div>
  );
}

function StatPill({ value, label, accent = false }: { value?: number | null; label: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm ${
      accent
        ? "border-[#ffd4b3] bg-[#fff7f0]"
        : "border-[#d9e4f2] bg-white/90 backdrop-blur-sm"
    }`}>
      <span className={`text-xl font-black tabular-nums ${accent ? "text-[#ff6800]" : "text-[#0054d2]"}`}>
        {value?.toLocaleString() ?? "–"}
      </span>
      <span className="text-xs font-bold text-[#8097b1]">{label}</span>
    </div>
  );
}

function HowCard({
  step, icon: Icon, title, description, accent = false,
}: {
  step: number; icon: typeof Search; title: string; description: string; accent?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-6 transition duration-200 hover:-translate-y-1 ${accent ? "border-[#0054d2]/20 bg-[#0054d2] shadow-[0_16px_40px_rgba(0,84,210,.3)]" : "border-[#e6edf7] bg-white shadow-sm hover:border-[#c4d7f4] hover:shadow-[0_12px_32px_rgba(0,84,210,.1)]"}`}>
      <span className={`mb-4 flex size-12 items-center justify-center rounded-2xl ${accent ? "bg-white/15 text-white" : "bg-[#eef5ff] text-[#0054d2]"}`}>
        <Icon className="size-6" />
      </span>
      <p className={`absolute right-5 top-3 text-6xl font-black opacity-[0.07] ${accent ? "text-white" : "text-[#0054d2]"}`}>{step}</p>
      <h3 className={`text-lg font-black ${accent ? "text-white" : "text-[#0b1a2e]"}`}>{title}</h3>
      <p className={`mt-1.5 text-sm leading-relaxed ${accent ? "text-blue-100" : "text-[#64748b]"}`}>{description}</p>
    </div>
  );
}

function BandHeader({
  eyebrow, title, href, icon: Icon, action = "ყველა", accent = false,
}: {
  eyebrow: string; title: string; href: string; icon?: typeof Zap; action?: string; accent?: boolean;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${accent ? "border-[#ffd4b3] bg-[#fff1e8] text-[#ff6800]" : "border-[#d9e4f2] bg-[#eef5ff] text-[#0054d2]"}`}>
            <Icon className="size-4" />
          </span>
        )}
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${accent ? "text-[#ff6800]" : "text-[#0054d2]"}`}>{eyebrow}</p>
          <h2 className="text-lg font-black text-[#0b1a2e] sm:text-xl">{title}</h2>
        </div>
      </div>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#d9e4f2] bg-white px-3 py-1.5 text-xs font-black text-[#334155] shadow-sm transition hover:border-[#0054d2] hover:text-[#0054d2]">
        {action} <ArrowRight className="size-3.5" />
      </Link>
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
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-[#ffd9bd] bg-white shadow-[0_8px_30px_rgba(255,104,0,.12)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(255,104,0,.2)]">
      <Link href={`/products/${product.slug}`} className="relative block flex-1 overflow-hidden">
        <ProductImage src={image} alt={product.name} priority tall />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ff7a18] to-[#ff5400] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_8px_20px_rgba(255,104,0,.3)]">
          <Flame className="size-3.5" /> დღის ლიდერი
        </span>
        {discount > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-[#ff5400] px-2.5 py-1 text-sm font-black text-white shadow-[0_10px_24px_rgba(255,84,0,.3)]">
            -{discount}%
          </span>
        )}
      </Link>

      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-black text-[#12203a]">
            <ShopMark shop={offer.shop} size="sm" />
            <span className="truncate">{offer.shop.name}</span>
          </span>
          <AvailabilityBadge availability={offer.availability} />
        </div>

        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-base font-black leading-snug text-[#12203a] hover:text-[#0054d2] sm:text-lg">
          {product.name}
        </Link>

        <div className="flex flex-col gap-2">
          <PriceDisplay price={offer.currentPrice} oldPrice={offer.oldPrice} strong />
          {savings > 0 && (
            <span className="inline-flex w-fit items-center gap-1 rounded-lg bg-[#eaf8ef] px-2 py-1 text-xs font-black text-[#15803d] ring-1 ring-[#bbefcc]">
              <TrendingDown className="size-3.5" /> დაზოგე {formatGel(savings)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-t border-[#f1e7df] pt-2.5 text-[11px] font-bold text-[#8097b1]">
          <Store className="size-3.5 shrink-0 text-[#ff6800]" />
          <span className="min-w-0 truncate">
            {shopCount > 1
              ? <span className="font-black text-[#0054d2]">{shopCount} მაღაზია</span>
              : `${product.offerCount ?? product.offers.length} შეთავაზება`}
          </span>
          <LastUpdatedText value={offer.lastSeenAt} className="ml-auto text-[11px] shrink-0" />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link href={`/products/${product.slug}`} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0054d2] px-3 text-sm font-black text-white shadow-[0_4px_12px_rgba(0,84,210,.22)] transition hover:bg-[#003f9f]">
            <Scale className="size-4" /> შეადარე ფასი
          </Link>
          <a href={`/api/out/${offer.id}`} target="_blank" rel="noreferrer" aria-label={`${offer.shop.name} მაღაზიაში ნახვა`} title="მაღაზიაში ნახვა" className="grid h-11 w-11 place-items-center rounded-xl border border-[#ffd9bd] bg-white text-[#ff6800] transition hover:bg-[#fff1e8]">
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
