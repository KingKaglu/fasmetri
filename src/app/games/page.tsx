import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Cpu, Gamepad2, Info, MemoryStick, Monitor } from "lucide-react";
import { listPublicProductMatches } from "@/lib/catalog";
import type { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { JsonLd } from "@/components/json-ld";
import { ProductImage, SectionHeader } from "@/components/public-ui";
import { siteUrl } from "@/config/site";
import {
  GAMES,
  VERDICT_LABELS,
  VERDICT_ORDER,
  evaluateGameFit,
  getGame,
  resolveGpu,
  resolveRamGb,
  runsGame,
  type GameFit,
  type Verdict,
} from "@/config/gameCompatibility";

export const revalidate = 600;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}): Promise<Metadata> {
  const game = getGame((await searchParams).game ?? "") ?? GAMES[0];
  const title = `რომელი ლეპტოპი გაუშვებს ${game.name}-ს`;
  return {
    title,
    description: `${game.name} — ნახე რომელი ლეპტოპები გაუშვებს თამაშს, რა პარამეტრებზე და რამდენ კადრზე. ფასები ქართული მაღაზიებიდან.`,
    alternates: { canonical: "/games" },
    openGraph: { title: `${title} — ფასმეტრი`, type: "website" },
  };
}

// Verdict → badge styling. Green reads "buy this", amber "it will do", red "no".
const VERDICT_STYLE: Record<Verdict, string> = {
  excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  good: "bg-blue-50 text-[var(--accent)] border-blue-200",
  playable: "bg-amber-50 text-amber-700 border-amber-200",
  marginal: "bg-orange-50 text-orange-700 border-orange-200",
  unsupported: "bg-red-50 text-red-600 border-red-200",
  unknown: "bg-gray-50 text-gray-500 border-gray-200",
};

type Scored = { product: ProductView; fit: GameFit; gpuName: string | null; ramGb: number | null; price: number };

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const activeGame = getGame((await searchParams).game ?? "") ?? GAMES[0];

  // Only laptops can be scored — phones and TVs have no comparable GPU tier.
  //
  // Deliberately unpaginated: listPublicProducts caps pageSize at 200, and the
  // laptop catalog is larger than that. Taking the first page sorted by price
  // would silently drop the most powerful machines — exactly the ones a gamer
  // is here for — leaving the "runs it excellently" groups permanently empty.
  // Scoring is regex over the title, so reading the full set is cheap, and the
  // result is cached for 10 minutes anyway.
  const laptops = await listPublicProductMatches({ category: "laptops", sort: "lowest" });

  const scored: Scored[] = laptops
    .map((product) => {
      const offer = product.offers[0];
      if (!offer) return null;
      const gpu = resolveGpu(product.name);
      return {
        product,
        fit: evaluateGameFit(product.name, activeGame),
        gpuName: gpu.kind === "scored" ? gpu.name : gpu.kind === "apple" ? gpu.name : null,
        ramGb: resolveRamGb(product.name),
        price: offer.currentPrice,
      };
    })
    .filter((entry): entry is Scored => entry !== null);

  // Group by verdict, cheapest first inside each group — the buyer's question is
  // "what is the cheapest laptop that runs this well", so price order matters
  // more than raw performance order within a bucket.
  const groups = VERDICT_ORDER.map((verdict) => ({
    verdict,
    entries: scored.filter((entry) => entry.fit.verdict === verdict).sort((a, b) => a.price - b.price),
  })).filter((group) => group.entries.length > 0);

  const playable = scored.filter((entry) => runsGame(entry.fit.verdict)).sort((a, b) => a.price - b.price);
  const playableCount = playable.length;
  const cheapestPlayable = playable[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GAMES.map((game) => ({
      "@type": "Question",
      name: `რომელი ლეპტოპი გაუშვებს ${game.name}-ს?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${game.name} (${game.genre}) — ფასმეტრი ადარებს ქართულ მაღაზიებში არსებულ ლეპტოპებს ვიდეობარათის მიხედვით და აჩვენებს მოსალოდნელ პარამეტრებსა და კადრებს.`,
      },
    })),
  };

  return (
    <div className="min-h-screen">
      <JsonLd data={jsonLd} />

      {/* Hero — the "ad" the buyer lands on */}
      <section className="hero-frame !rounded-none">
        <div className="shell relative z-10 py-10 sm:py-14">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-white/85">
            <Gamepad2 className="size-3.5" />
            გეიმინგ ლეპტოპები
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            რომელი ლეპტოპი გაუშვებს <span className="hero-highlight">{activeGame.name}</span>-ს?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
            ავირჩიეთ ლეპტოპები ქართული მაღაზიებიდან და დავაჯგუფეთ იმის მიხედვით, თუ რა პარამეტრებზე და
            რამდენ კადრზე ითამაშებ. ფასი და მაღაზია იქვეა.
          </p>

          {/* Game switcher */}
          <div className="mt-7 flex flex-wrap gap-2">
            {GAMES.map((game) => {
              const active = game.slug === activeGame.slug;
              return (
                <Link
                  key={game.slug}
                  href={`/games?game=${game.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#1d4ed8]"
                      : "rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/20 hover:text-white"
                  }
                >
                  {game.name}
                </Link>
              );
            })}
          </div>

          {cheapestPlayable && (
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="stat-rule">
                <div className="text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
                  {playableCount}
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-white/60">ლეპტოპი გაუშვებს</div>
              </div>
              <div className="stat-rule">
                <div className="text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
                  {formatGel(cheapestPlayable.price)}
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-white/60">ყველაზე იაფი, რომელიც გაუშვებს</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="shell py-8">
        <SectionHeader
          eyebrow={activeGame.genre}
          title={`${activeGame.name} — ${activeGame.tagline}`}
          description={`რეკომენდებული ოპერატიული მეხსიერება: ${activeGame.recommendedRamGb}GB. შეფასება ეყრდნობა ვიდეობარათის კლასს — ეს არის სავარაუდო ორიენტირი 1080p გარჩევადობისთვის, არა კონკრეტული ტესტის შედეგი.`}
        />

        {/* Honesty note — these are estimates, and buyers deserve to know. */}
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-blue-100 bg-[var(--accent-soft)] px-4 py-3 text-[12.5px] leading-5 text-[var(--muted-strong)]">
          <Info className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
          <span>
            კადრების რაოდენობა სავარაუდოა და დამოკიდებულია ლეპტოპის კონკრეტულ კონფიგურაციაზე
            (ვიდეობარათის სიმძლავრე, გაცივება, დრაივერები). ვიყენებთ ვიდეობარათის კლასს, რომელსაც
            ვკითხულობთ მაღაზიის აღწერიდან.
          </span>
        </p>

        {groups.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            ამჟამად ლეპტოპები ვერ მოიძებნა. სცადე მოგვიანებით.
          </p>
        ) : (
          <div className="grid gap-8">
            {groups.map((group) => (
              <div key={group.verdict}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-bold ${VERDICT_STYLE[group.verdict]}`}
                  >
                    {VERDICT_LABELS[group.verdict]}
                  </span>
                  <span className="text-[12px] font-medium text-gray-400">
                    {group.entries.length} ლეპტოპი
                  </span>
                </div>

                <div className="grid gap-2.5">
                  {group.entries.slice(0, 12).map((entry) => (
                    <LaptopRow key={entry.product.id} entry={entry} />
                  ))}
                </div>

                {group.entries.length > 12 && (
                  <p className="mt-2 text-[12px] text-gray-400">
                    და კიდევ {group.entries.length - 12} ლეპტოპი ამ კატეგორიაში
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/categories/laptops"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            ყველა ლეპტოპის ნახვა
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function LaptopRow({ entry }: { entry: Scored }) {
  const { product, fit, gpuName, ramGb } = entry;
  const offer = product.offers[0];
  const shopCount = new Set(product.offers.map((item) => item.shop.id)).size;

  return (
    <article className="flex items-stretch gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-[var(--accent)] sm:gap-4 sm:p-4">
      <Link
        href={`/products/${product.slug}`}
        className="w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 sm:w-24"
      >
        <ProductImage
          src={offer.imageUrl ?? product.imageUrl}
          alt={product.name}
          categorySlug={product.category?.slug}
          shopName={offer.shop.name}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/products/${product.slug}`}
          title={product.name}
          className="line-clamp-3 text-[13px] font-semibold leading-snug text-gray-900 hover:text-[var(--accent)] sm:line-clamp-2"
        >
          {product.name}
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-gray-500">
          {gpuName && (
            <span className="inline-flex items-center gap-1">
              <Monitor className="size-3.5 text-gray-400" />
              {gpuName}
            </span>
          )}
          {ramGb && (
            <span className="inline-flex items-center gap-1">
              <MemoryStick className="size-3.5 text-gray-400" />
              {ramGb}GB RAM
            </span>
          )}
          {shopCount > 1 && <span className="text-emerald-700">{shopCount} მაღაზია</span>}
        </div>

        {fit.fps && fit.preset && (
          <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 text-[12px] font-medium text-gray-700">
            <Cpu className="size-3.5 text-[var(--accent)]" />
            {fit.preset} · ~{fit.fps[0]}–{fit.fps[1]} FPS
          </p>
        )}

        {fit.notes.map((note) => (
          <p key={note} className="mt-1 text-[11px] text-amber-700">
            {note}
          </p>
        ))}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2 text-right">
        <span className="price-now text-base sm:text-lg">{formatGel(entry.price)}</span>
        <Link
          href={`/products/${product.slug}`}
          className="inline-flex h-9 items-center rounded-full border border-gray-200 px-3.5 text-[12px] font-semibold text-gray-700 hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          ნახვა
        </Link>
      </div>
    </article>
  );
}
