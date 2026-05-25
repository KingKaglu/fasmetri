import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, BadgePercent, Clock3, Layers3, ScanSearch, Store } from "lucide-react";
import { getCatalogStats, listPublicProducts, listPublicShops } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { ProductMarquee } from "@/components/product-marquee";
import { SearchBar } from "@/components/search-bar";
import { LastUpdatedText, SectionHeader } from "@/components/public-ui";
import { ShopCard } from "@/components/shop-card";
import { compareDealPriority, filterCuratedProducts, PRIORITY_CATEGORIES } from "@/config/productCuration";

export const metadata: Metadata = {
  title: "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში",
  description: "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
  alternates: { canonical: "/" },
};
export const dynamic = "force-dynamic";

export default async function Home() {
  const [discoveryCandidates, shops, stats] = await Promise.all([
    listPublicProducts({ categorySlugs: PRIORITY_CATEGORIES, sort: "priority", pageSize: 200, candidateLimit: 240 }),
    listPublicShops(),
    getCatalogStats(),
  ]);
  const activeShops = shops
    .filter((shop) => (shop.productCount ?? 0) > 0)
    .sort((left, right) => (right.productCount ?? 0) - (left.productCount ?? 0));
  const discounts = selectHomeDeals(
    discoveryCandidates
      .filter((product) => product.offers.some((offer) => offer.discountPercent > 0))
      .sort(compareDealPriority),
  );
  const trending = selectHomeDiscovery(discoveryCandidates);

  return (
    <>
      <section className="shell py-5 sm:py-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <div className="grid gap-4">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-black sm:text-sm">
                <span className="rounded-full border border-[#d9e4f2] bg-white px-3 py-2 text-[#0054d2] shadow-sm">ქართული ონლაინ მაღაზიები</span>
                <span className="rounded-full bg-[#fff1e8] px-3 py-2 text-[#c2410c]">ფასები რეგულარულად ახლდება</span>
              </div>
              <h1 className="text-3xl font-black leading-[1.08] text-[#12203a] sm:text-5xl">შეადარე ფასები ქართულ მაღაზიებში</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#475569] sm:text-lg">იპოვე საუკეთესო ფასი, აქციები და შეთავაზებები ერთ სივრცეში.</p>
            </div>
            <div className="max-w-3xl"><SearchBar large /></div>

            <div className="grid gap-3 rounded-[1.45rem] border border-[#d9e4f2] bg-white p-3 shadow-[0_18px_48px_rgba(18,32,58,.08)] lg:grid-cols-[minmax(0,1.35fr)_minmax(15rem,.65fr)]">
              <HeroPromo />
              <div className="grid gap-2">
                <HeroSignal icon={ScanSearch} title="შეადარე ერთ ხედში" body="რამდენიმე მაღაზიის ფასი ერთად" />
                <HeroSignal icon={BadgePercent} title="იპოვე აქციები" body="ფასდაკლებები და ძველი ფასი" tone="orange" />
                <HeroSignal icon={Clock3} title="ბოლო განახლება" body={stats.latestUpdate ? "ფასები ახლახან შემოწმდა" : "მონაცემები მოწმდება"} />
              </div>
            </div>
          </div>

          <aside className="hidden rounded-[1.45rem] border border-[#d9e4f2] bg-white p-5 shadow-[0_18px_48px_rgba(18,32,58,.08)] lg:block">
            <p className="text-sm font-black text-[#0054d2]">რატომ ფასმეტრი?</p>
            <h2 className="mt-2 text-2xl font-black leading-tight">ნაკლები ძებნა, უკეთესი არჩევანი</h2>
            <p className="mt-3 text-sm leading-7 text-[#64748b]">ფასები შეიძლება შეიცვალოს მაღაზიაში, ამიტომ ყიდვამდე საბოლოო ფასი ყოველთვის გადაამოწმე.</p>
            <div className="mt-5 grid gap-2">
              <HeroSignal icon={Store} title={`${stats.shops} მაღაზია`} body="აქტიური წყაროები" />
              <HeroSignal icon={Layers3} title={`${stats.products} პროდუქტი`} body="შედარებისთვის მზად" />
              <HeroSignal icon={BadgePercent} title={`${stats.deals} აქცია`} body="ფასდაკლებული შეთავაზება" tone="orange" />
              {stats.latestUpdate ? (
                <div className="rounded-2xl border border-[#d9e4f2] bg-[#f8fafc] p-3">
                  <p className="text-xs font-black text-[#0054d2]">ბოლო განახლება</p>
                  <LastUpdatedText value={stats.latestUpdate} className="mt-1 text-xs font-bold" />
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <HomeBand title="დღის საუკეთესო აქციები" href="/deals">
        <ProductGrid
          products={discounts}
          deal
          density="compact"
          resetHref="/deals"
          emptyTitle="სასარგებლო აქციები მალე გამოჩნდება"
          emptyDescription="ფასმეტრი პირველ რიგში მაღალმოთხოვნად პროდუქტებზე ახალ ფასდაკლებებს აჩვენებს."
        />
      </HomeBand>

      <HomeBand title="ყველაზე მოთხოვნადი პროდუქტები" href="/search?sort=priority">
        <div className="hidden lg:block">
          {trending.length ? (
            <ProductMarquee products={trending} />
          ) : (
            <ProductGrid
              products={trending}
              density="compact"
              resetHref="/search"
              emptyTitle="პოპულარული პროდუქტები მალე დაემატება"
              emptyDescription="ახალი შეთავაზებები განახლებისთანავე გამოჩნდება შედარებისთვის."
            />
          )}
        </div>
        <div className="lg:hidden">
          <ProductGrid
            products={trending}
            density="compact"
            resetHref="/search"
            emptyTitle="პოპულარული პროდუქტები მალე დაემატება"
            emptyDescription="ახალი შეთავაზებები განახლებისთანავე გამოჩნდება შედარებისთვის."
          />
        </div>
      </HomeBand>

      <section className="shell mb-14">
        <div className="section-rule mb-6 h-px" />
        <SectionHeader eyebrow="მაღაზიები" title="აქტიური მაღაზიები" description="ქართული ონლაინ მაღაზიებიდან შეგროვებული შეთავაზებები ერთ ხედში შეადარე." href="/shops" action="ყველა" />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {activeShops.slice(0, 3).map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      </section>
    </>
  );
}

function selectHomeDeals(products: Awaited<ReturnType<typeof listPublicProducts>>) {
  const featured = filterCuratedProducts(products, {
    requireImage: true,
    requireUsefulCategory: true,
    requireFeaturedComparison: true,
  });
  const availableUsefulDeals = filterCuratedProducts(products, {
    requireImage: true,
    requireUsefulCategory: true,
    inStockOnly: true,
  });
  return uniqueProducts([...featured, ...availableUsefulDeals]).slice(0, 8);
}

function selectHomeDiscovery(products: Awaited<ReturnType<typeof listPublicProducts>>) {
  const featured = filterCuratedProducts(products, {
    requireImage: true,
    requireUsefulCategory: true,
    requireFeaturedComparison: true,
  });
  const discovery = filterCuratedProducts(products, {
    requireImage: true,
    requireUsefulCategory: true,
    requireDiscoveryQuality: true,
  });
  const availableUsefulProducts = filterCuratedProducts(products, {
    requireImage: true,
    requireUsefulCategory: true,
    inStockOnly: true,
  });
  return uniqueProducts([...featured, ...discovery, ...availableUsefulProducts]).slice(0, 8);
}

function uniqueProducts(products: Awaited<ReturnType<typeof listPublicProducts>>) {
  return [...new Map(products.map((product) => [product.id, product])).values()];
}

function HeroPromo() {
  return (
    <div
      className="relative isolate min-h-[19rem] overflow-hidden rounded-[1.2rem] border border-[#d9e4f2] bg-cover bg-center p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22)] sm:p-6"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(18,32,58,.94) 0%, rgba(18,32,58,.86) 38%, rgba(18,32,58,.34) 69%, rgba(18,32,58,.08) 100%), url('/hero-market.png')",
      }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_24%_18%,rgba(0,84,210,.42),transparent_18rem),radial-gradient(circle_at_78%_70%,rgba(255,104,0,.26),transparent_15rem)]" />
      <div className="flex h-full max-w-xl flex-col justify-between gap-7">
        <div>
          <span className="inline-flex rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur">სწრაფი შედარება</span>
          <h2 className="mt-4 max-w-lg text-2xl font-black leading-tight sm:text-3xl">სანამ იყიდი, გადაამოწმე ფასი</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/90 sm:text-base">ნახე დადასტურებული შეთავაზებები, ფასდაკლებები და მაღაზიის ბმული ერთ სუფთა ხედში.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/search" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#ff6800] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,104,0,.3)] hover:bg-[#e85f00]">
            ძებნა
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/deals" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/30 bg-white/12 px-4 text-sm font-black text-white backdrop-blur hover:bg-white/20">
            აქციები
          </Link>
        </div>
      </div>
      <div className="absolute bottom-5 right-5 hidden rounded-3xl border border-white/20 bg-white/92 p-4 text-[#12203a] shadow-[0_18px_44px_rgba(18,32,58,.16)] backdrop-blur xl:block">
        <p className="text-xs font-black text-[#64748b]">დადასტურებული შეთავაზებები</p>
        <p className="mt-1 text-2xl font-black text-[#0054d2]">ერთ სივრცეში</p>
      </div>
    </div>
  );
}

function HeroSignal({ icon: Icon, title, body, tone = "blue" }: { icon: typeof Store; title: string; body: string; tone?: "blue" | "orange" }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#d9e4f2] bg-[#f8fafc] p-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone === "orange" ? "bg-[#fff1e8] text-[#ff6800]" : "bg-[#eef5ff] text-[#0054d2]"}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-[#12203a]">{title}</span>
        <span className="block truncate text-xs font-bold text-[#64748b]">{body}</span>
      </span>
    </div>
  );
}

function HomeBand({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="shell mb-10">
      <div className="section-rule mb-6 h-px" />
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-black text-[#003f9f]">ნახვა <ArrowRight className="size-4" /></Link>
      </div>
      {children}
    </section>
  );
}
