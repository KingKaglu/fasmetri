import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { getPriceIndex, CategoryIndex, IndexMover } from "@/lib/priceIndex";
import { formatGel, formatRelativeTime, formatNumber } from "@/lib/format";
import { ProductImage } from "@/components/public-ui";

export const metadata: Metadata = {
  title: "ფასების ინდექსი — როგორ იცვლება ტექნიკის ფასები საქართველოში",
  description:
    "ფასმეტრის ფასების ინდექსი აჩვენებს, როგორ შეიცვალა მობილურების, ლეპტოპებისა და კონსოლების ფასები ქართულ ონლაინ მაღაზიებში ბოლო 7 დღეში — რეალური, დაკვირვებული ფასებით.",
  alternates: { canonical: "/price-index" },
};

// The index itself recomputes every 30 minutes (unstable_cache in priceIndex);
// match the page window so both stay in step.
export const revalidate = 1800;

// Below this the averages are noise, not a market read.
const MIN_SAMPLE = 10;

export default async function PriceIndexPage() {
  const index = await getPriceIndex();
  const ready = index.overall.sampleSize >= MIN_SAMPLE;
  const flat = Math.max(0, index.overall.sampleSize - index.overall.drops - index.overall.rises);

  return (
    <div className="min-h-screen">
      {/* Masthead band — the "markets page" front */}
      <section className="section-ink section-ink-grain">
        <div className="shell pt-9 pb-9 sm:pt-12 sm:pb-11">
          <div className="mb-5 inline-flex w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-on-ink-fill px-4 py-1.5 text-[12px] font-semibold text-on-ink-soft">
            <span className="text-white">ფასმეტრი</span>
            <span aria-hidden className="text-on-ink-faint">/</span>
            <span>ბაზრის მონიტორინგი</span>
            <span aria-hidden className="hidden text-on-ink-faint sm:inline">/</span>
            <span className="hidden sm:inline">{georgianDateline()}</span>
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl">
            ფასების ინდექსი
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-on-ink-muted sm:text-base">
            რამდენად გაიაფდა ან გაძვირდა ტექნიკა საქართველოში? ინდექსი ადარებს ერთი და იმავე შეთავაზების
            დღევანდელ ფასს მისსავე ფასთან {index.windowDays} დღის წინ — ასე ჩანს ბაზრის რეალური მოძრაობა და
            არა კატალოგის ცვლილება.
          </p>

          {ready ? (
            <div className="mt-8 flex flex-wrap gap-6 sm:gap-10">
              <div className="stat-rule min-w-0">
                <div className="font-display flex items-baseline gap-2 text-4xl font-bold tabular-nums leading-none text-white sm:text-5xl">
                  <span aria-hidden className="text-2xl sm:text-3xl">{index.overall.changePct < 0 ? "▼" : index.overall.changePct > 0 ? "▲" : "•"}</span>
                  {formatPct(index.overall.changePct)}
                </div>
                <div className="mt-2 text-[12px] font-medium text-on-ink-muted">
                  ბაზარი ბოლო {index.windowDays} დღეში
                </div>
              </div>
              <IndexStat label="გაიაფდა" value={index.overall.drops} />
              <IndexStat label="გაძვირდა" value={index.overall.rises} />
              <IndexStat label="უცვლელი" value={flat} />
              <IndexStat label="დაკვირვებული შეთავაზება" value={index.overall.sampleSize} />
            </div>
          ) : (
            <div className="mt-8 max-w-xl border border-on-ink-line-strong px-4 py-3 text-sm text-on-ink-muted">
              ინდექსი ჯერ გროვდება — საკმარისი ფასის ისტორია დაგროვებისთანავე აქ გამოჩნდება ბაზრის 7-დღიანი სურათი.
            </div>
          )}
        </div>
      </section>

      {ready && (
        <>
          {/* Per-category index — ruled market table */}
          <section className="shell pt-8 pb-4">
            <SectionHead
              eyebrow="კატეგორიები"
              title={`${index.windowDays}-დღიანი ცვლილება კატეგორიების მიხედვით`}
            />
            <div className="wire-table overflow-hidden">
              <ul>
                {index.categories.map((category) => (
                  <CategoryRow
                    key={category.slug}
                    category={category}
                    maxAbsPct={Math.max(...index.categories.map((item) => Math.abs(item.changePct)), 0.1)}
                  />
                ))}
              </ul>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              განახლდა {formatRelativeTime(index.generatedAt)} · საშუალო ცვლილება კატეგორიის ყველა დაკვირვებულ შეთავაზებაზე
            </p>
          </section>

          {/* Movers — two-column drop/rise wire */}
          <section className="section-mist mt-8 border-y border-line">
            <div className="shell pt-8 pb-8">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
                <div className="min-w-0">
                  <SectionHead eyebrow="▼ გაიაფდა" title="ყველაზე მეტად გაიაფდა" />
                  <MoverList movers={index.topDrops} direction="drop" emptyText="ამ კვირაში მკვეთრი გაიაფება არ დაფიქსირებულა." />
                </div>
                <div className="min-w-0">
                  <SectionHead eyebrow="▲ გაძვირდა" title="ყველაზე მეტად გაძვირდა" />
                  <MoverList movers={index.topRises} direction="rise" emptyText="ამ კვირაში მკვეთრი გაძვირება არ დაფიქსირებულა." />
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Methodology + CTA */}
      <section className="section-hatch border-b border-line">
        <div className="shell pt-8 pb-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <LineChart className="size-4" />
                როგორ ითვლება ინდექსი
              </p>
              <p className="mt-2 text-[13px] leading-6 text-ink-soft">
                ყოველი შეთავაზების დღევანდელი ფასი დარდება მისსავე, მაღაზიის გვერდიდან ჩაწერილ ფასს {index.windowDays} დღის
                წინ. ცვლილებები საშუალდება კატეგორიების მიხედვით; უკიდურესი გადახრები (მაგ. მონაცემის შეცდომა) იჭრება,
                რომ ერთმა პროდუქტმა ინდექსი ვერ გადაწიოს. შედეგი CPI-ის მსგავსი, „ერთნაირი კალათის&quot; საზომია — ის არ
                იცვლება იმის მიხედვით, რომელი პროდუქტები დაემატა ან მოაკლდა კატალოგს ამ კვირაში.
              </p>
            </div>
            <Link
              href="/deals"
              className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-bold text-accent-ink hover:bg-accent-strong"
            >
              ნახე დღევანდელი ფასდაკლებები
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatPct(value: number, digits = 1) {
  const abs = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return "0%";
}

function georgianDateline() {
  return new Intl.DateTimeFormat("ka-GE", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

function IndexStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-rule min-w-0">
      <div className="font-display text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
        {formatNumber(value)}
      </div>
      <div className="mt-1.5 text-[12px] font-medium text-on-ink-muted">{label}</div>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="masthead mb-5">
      <div className="masthead-row">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="masthead-kicker">{eyebrow}</p>
          <h2 className="masthead-title min-w-0">{title}</h2>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ category, maxAbsPct }: { category: CategoryIndex; maxAbsPct: number }) {
  const dropped = category.changePct < 0;
  const flatMove = category.changePct === 0;
  const barWidth = Math.max(4, Math.round((Math.abs(category.changePct) / maxAbsPct) * 100));

  return (
    <li className="wire-row flex min-w-0 items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <span
        className={`w-10 shrink-0 text-center text-[13px] font-black tabular-nums ${dropped ? "text-success" : "text-danger"}`}
        aria-hidden
      >
        {flatMove ? "•" : dropped ? "▼" : "▲"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{category.nameKa}</span>
        <span className="block truncate text-[12px] text-muted">
          {category.sampleSize} შეთავაზება · {category.drops} გაიაფდა · {category.rises} გაძვირდა
        </span>
      </span>
      {/* Move bar — filled ink for drops (prices falling), outlined for rises */}
      <span className="hidden h-2 w-32 shrink-0 border border-line-strong bg-surface sm:block md:w-44" aria-hidden>
        <span
          className={`block h-full ${dropped ? "bg-success-solid" : flatMove ? "bg-transparent" : "bg-danger-line"}`}
          style={{ width: `${barWidth}%` }}
        />
      </span>
      <span
        className={`w-16 shrink-0 text-right text-sm font-black tabular-nums sm:w-20 ${
          dropped ? "text-success" : "text-danger"
        }`}
      >
        {formatPct(category.changePct)}
      </span>
    </li>
  );
}

function MoverList({ movers, direction, emptyText }: { movers: IndexMover[]; direction: "drop" | "rise"; emptyText: string }) {
  if (!movers.length) {
    return <p className="border border-line bg-surface px-4 py-6 text-center text-sm text-muted">{emptyText}</p>;
  }
  return (
    <div className="wire-table overflow-hidden">
      <ul>
        {movers.map((mover, rank) => (
          <MoverRow key={`${mover.productSlug}-${mover.shopName}`} mover={mover} rank={rank + 1} direction={direction} />
        ))}
      </ul>
    </div>
  );
}

function MoverRow({ mover, rank, direction }: { mover: IndexMover; rank: number; direction: "drop" | "rise" }) {
  const dropped = direction === "drop";
  const delta = Math.abs(mover.priceNow - mover.priceThen);

  return (
    <li>
      <Link
        href={`/products/${mover.productSlug}`}
        className="wire-row flex min-w-0 items-center gap-3 px-3 py-2.5 hover:bg-surface-soft sm:px-4"
      >
        <span className="w-6 shrink-0 text-center text-[12px] font-black tabular-nums text-subtle" aria-hidden>
          {rank}
        </span>
        <span className="relative block size-11 shrink-0 overflow-hidden border border-line bg-surface">
          <ProductImage src={mover.imageUrl} alt={mover.productName} categorySlug={mover.categorySlug} shopName={mover.shopName} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{mover.productName}</span>
          <span className="block truncate text-[12px] text-muted">{mover.shopName}</span>
        </span>
        <span className="hidden shrink-0 text-right sm:block">
          <span className="block text-[12px] tabular-nums text-muted line-through">{formatGel(mover.priceThen)}</span>
          <span className="block text-sm font-bold tabular-nums text-ink">{formatGel(mover.priceNow)}</span>
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
            dropped ? "bg-savings-soft text-success" : "bg-deal-soft text-danger-strong"
          }`}
        >
          {dropped ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
          {formatPct(mover.changePct)}
        </span>
        <span className="sr-only">{dropped ? `გაიაფდა ${formatGel(delta)}-ით` : `გაძვირდა ${formatGel(delta)}-ით`}</span>
      </Link>
    </li>
  );
}
