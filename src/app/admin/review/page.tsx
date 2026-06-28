import Link from "next/link";
import { ExternalLink, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { AdminLogin } from "@/components/admin-login";
import {
  AutoTriageButton,
  BulkApproveForm,
  OpenBothButton,
  ReviewRowActions,
} from "@/components/admin-review-actions";
import { ReviewKeyboardNav } from "@/components/admin-review-keyboard";
import {
  AdminConfidenceBar,
  AdminEmptyState,
  AdminLoginShell,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminStatusPill,
} from "@/components/admin-ui";
import { ProductImage } from "@/components/public-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatGel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SortKey = "best" | "risky" | "gap" | "newest";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Build a /admin/review href that preserves the current filters, overriding
// only the keys passed in. Empty/undefined values drop the param entirely.
function reviewHref(current: { category?: string; sort?: string; max?: string }, override: Partial<typeof current>) {
  const next = { ...current, ...override };
  const sp = new URLSearchParams();
  if (next.category) sp.set("category", next.category);
  if (next.sort && next.sort !== "best") sp.set("sort", next.sort);
  if (next.max) sp.set("max", next.max);
  const query = sp.toString();
  return query ? `/admin/review?${query}` : "/admin/review";
}

// Relative price spread between two prices, as a multiple (hi/lo). A large
// spread is the single strongest signal of a wrong match (e.g. a ₾149 game
// matched to a ₾1719 console). Returns null when either price is missing.
function priceSpread(a?: number | null, b?: number | null) {
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const multiple = hi / lo;
  return { multiple, pct: Math.round((multiple - 1) * 100) };
}

const TOKEN_RE = /[a-z0-9Ⴀ-ჿ]+/gi;

function titleTokens(value: string) {
  return new Set((value.toLowerCase().match(TOKEN_RE) ?? []).filter((token) => token.length > 1));
}

// Render a title with the tokens it shares with the other title subtly
// highlighted, so weak overlap (the usual cause of a bad match) is obvious.
function HighlightedTitle({ title, shared }: { title: string; shared: Set<string> }): ReactNode {
  const parts = title.split(/([a-z0-9Ⴀ-ჿ]+)/gi);
  return (
    <>
      {parts.map((part, index) => {
        const key = part.toLowerCase();
        if (key.length > 1 && shared.has(key)) {
          return (
            <mark key={index} className="rounded bg-[#ededee] px-0.5 text-[var(--brand)]">
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function SegLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center rounded-2xl px-3 text-xs font-black ${
        active ? "bg-[#0a0a0a] text-white" : "border border-[#e4e4e7] bg-white text-[var(--brand)] hover:border-[#0a0a0a]"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function AdminReviewPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  if (!prisma) {
    return (
      <AdminShell>
        <AdminEmptyState title="DATABASE_URL არ არის მითითებული" />
      </AdminShell>
    );
  }

  const params = await searchParams;
  const categoryParam = firstParam(params.category);
  const category = categoryParam === "mobiles" || categoryParam === "laptops" ? categoryParam : undefined;
  const sortParam = firstParam(params.sort);
  const sort: SortKey = sortParam === "risky" || sortParam === "gap" || sortParam === "newest" ? sortParam : "best";
  const maxParam = firstParam(params.max);
  const maxConfidence = maxParam === "70" || maxParam === "60" ? Number(maxParam) : undefined;

  const orderBy =
    sort === "risky"
      ? [{ confidence: "asc" as const }, { matchedAt: "desc" as const }]
      : sort === "newest"
        ? [{ matchedAt: "desc" as const }]
        : [{ confidence: "desc" as const }, { matchedAt: "desc" as const }];

  const [matches, totalPending, mobilesPending, laptopsPending] = await Promise.all([
    prisma.possibleMatch.findMany({
      where: {
        status: "PENDING",
        canonicalProduct: category ? { categorySlug: category } : undefined,
        confidence: maxConfidence ? { lte: maxConfidence } : undefined,
      },
      orderBy,
      take: 100,
      include: {
        shop: { select: { name: true, slug: true } },
        rawOffer: {
          select: {
            id: true,
            originalTitle: true,
            originalUrl: true,
            originalImageUrl: true,
            rawPrice: true,
            availability: true,
            scrapedAt: true,
            productOffer: { select: { canonicalProductId: true } },
          },
        },
        canonicalProduct: {
          select: {
            id: true,
            title: true,
            categorySlug: true,
            primaryImage: true,
            canonicalKey: true,
            product: { select: { slug: true } },
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: "asc" },
              take: 6,
              select: { id: true, title: true, url: true, currentPrice: true, shop: { select: { name: true, slug: true } } },
            },
          },
        },
      },
    }),
    prisma.possibleMatch.count({ where: { status: "PENDING" } }),
    prisma.possibleMatch.count({ where: { status: "PENDING", canonicalProduct: { categorySlug: "mobiles" } } }),
    prisma.possibleMatch.count({ where: { status: "PENDING", canonicalProduct: { categorySlug: "laptops" } } }),
  ]);

  // Offers already linked to this exact canonical (e.g. by a later matcher
  // run) don't need a decision — hide them from the queue.
  const filtered = matches.filter((match) => match.rawOffer.productOffer?.canonicalProductId !== match.canonicalProductId);

  // Precompute the price spread once per row; reused for the flag and (when
  // sorting by gap) the ordering.
  const rows = filtered
    .map((match) => {
      const newPrice = match.rawOffer.rawPrice != null ? Number(match.rawOffer.rawPrice) : null;
      const existingPrice = match.canonicalProduct.offers[0] ? Number(match.canonicalProduct.offers[0].currentPrice) : null;
      return { match, spread: priceSpread(newPrice, existingPrice) };
    })
    .sort((a, b) => (sort === "gap" ? (b.spread?.multiple ?? 0) - (a.spread?.multiple ?? 0) : 0));

  const shownPending = category ? (category === "mobiles" ? mobilesPending : laptopsPending) : totalPending;
  const flaggedCount = rows.filter((row) => row.spread && row.spread.multiple >= 1.35).length;
  const filters = { category, sort, max: maxParam };

  return (
    <AdminShell>
      <AdminPageHeader
        breadcrumbs={[{ label: "ადმინი", href: "/admin" }, { label: "Match review" }]}
        title="Match review queue"
        description={`Matcher-მა ეს წყვილები ვერ დაადასტურა ავტომატურად (confidence < 85). დარჩენილია ${shownPending} გადასაწყვეტი.`}
      >
        <AutoTriageButton />
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="Pending სულ" value={totalPending} tone={totalPending ? "warn" : "good"} />
        <AdminMetricCard label="ტელეფონები" value={mobilesPending} tone="info" />
        <AdminMetricCard label="ფასის რისკი (ამ სიაში)" value={flaggedCount} tone={flaggedCount ? "warn" : "good"} />
      </div>

      <AdminPanel
        title="ფილტრი, დახარისხება და bulk"
        description="Bulk დადასტურება ეხება ყველა pending match-ს არჩეულ კატეგორიაში. ⚠ ფასის სხვაობა ხშირად მცდარ დაკავშირებას ნიშნავს."
      >
        <div className="grid gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">კატეგორია</span>
            <SegLink href={reviewHref(filters, { category: undefined })} active={!category}>
              ყველა ({totalPending})
            </SegLink>
            <SegLink href={reviewHref(filters, { category: "mobiles" })} active={category === "mobiles"}>
              ტელეფონები ({mobilesPending})
            </SegLink>
            <SegLink href={reviewHref(filters, { category: "laptops" })} active={category === "laptops"}>
              ლეპტოპები ({laptopsPending})
            </SegLink>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">დახარისხება</span>
            <SegLink href={reviewHref(filters, { sort: "best" })} active={sort === "best"}>საუკეთესო confidence</SegLink>
            <SegLink href={reviewHref(filters, { sort: "risky" })} active={sort === "risky"}>ყველაზე სარისკო</SegLink>
            <SegLink href={reviewHref(filters, { sort: "gap" })} active={sort === "gap"}>ფასის სხვაობა</SegLink>
            <SegLink href={reviewHref(filters, { sort: "newest" })} active={sort === "newest"}>უახლესი</SegLink>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">confidence ჭერი</span>
              <SegLink href={reviewHref(filters, { max: undefined })} active={!maxConfidence}>ყველა</SegLink>
              <SegLink href={reviewHref(filters, { max: "70" })} active={maxConfidence === 70}>&lt; 70</SegLink>
              <SegLink href={reviewHref(filters, { max: "60" })} active={maxConfidence === 60}>&lt; 60</SegLink>
            </div>
            <BulkApproveForm category={category} />
          </div>
        </div>
      </AdminPanel>

      <div className="grid gap-3">
        {rows.map(({ match, spread }) => {
          const raw = match.rawOffer;
          const canonical = match.canonicalProduct;
          const cheapest = canonical.offers[0];
          const flagged = spread != null && spread.multiple >= 1.35;
          const spreadLabel = spread ? (spread.multiple >= 3 ? `×${spread.multiple.toFixed(1)}` : `+${spread.pct}%`) : null;
          const sharedWithCanonical = titleTokens(canonical.title);
          const sharedWithRaw = titleTokens(raw.originalTitle);
          return (
            <div
              key={match.id}
              data-review-row={match.id}
              className="rounded-[1.15rem] transition data-[selected=true]:ring-2 data-[selected=true]:ring-[#0a0a0a] data-[selected=true]:ring-offset-2"
            >
              <AdminPanel>
                <article className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <AdminConfidenceBar value={match.confidence} />
                      <AdminStatusPill tone="info">{canonical.categorySlug}</AdminStatusPill>
                      <AdminStatusPill>{match.shop.name}</AdminStatusPill>
                      {flagged ? (
                        <span
                          title={`ფასის სხვაობა: ${spreadLabel}. ხშირად მცდარი დაკავშირების ნიშანი.`}
                          className="inline-flex items-center gap-1 rounded-full border border-[#f2d98f] bg-[var(--warn-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--warn)]"
                        >
                          <TriangleAlert className="size-3" />
                          ფასის სხვაობა {spreadLabel}
                        </span>
                      ) : null}
                    </div>
                    <time className="shrink-0 text-xs font-black text-[var(--muted)]" dateTime={match.matchedAt.toISOString()}>
                      {formatRelativeTime(match.matchedAt)}
                    </time>
                  </div>

                  <p className="mt-2 rounded-xl border border-[#ededee] bg-[#fafafa] px-3 py-2 text-xs font-bold text-[var(--muted-strong)]">{match.reason}</p>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_13rem]">
                    <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-[1rem] border border-[#ededee] bg-[#fafafa] p-3">
                      <div className="overflow-hidden rounded-xl border border-[#ededee] bg-white">
                        <ProductImage src={raw.originalImageUrl} alt={raw.originalTitle} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{match.shop.name} — ახალი შეთავაზება</p>
                        <p className="mt-1 break-words text-sm font-black leading-snug text-[var(--brand)]">
                          <HighlightedTitle title={raw.originalTitle} shared={sharedWithCanonical} />
                        </p>
                        {raw.rawPrice != null ? <p className="mt-1 text-lg font-black tabular-nums text-[#087d8f]">{formatGel(Number(raw.rawPrice))}</p> : null}
                        <a href={raw.originalUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[var(--brand)] underline-offset-2 hover:underline">
                          მაღაზიაში ნახვა <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-[1rem] border border-[#ededee] bg-white p-3">
                      <div className="overflow-hidden rounded-xl border border-[#ededee] bg-[#fafafa]">
                        <ProductImage src={canonical.primaryImage} alt={canonical.title} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                          არსებული პროდუქტი · {canonical.offers.length}{canonical.offers.length >= 6 ? "+" : ""} მაღაზია
                        </p>
                        <p className="mt-1 break-words text-sm font-black leading-snug text-[var(--brand)]">
                          <HighlightedTitle title={canonical.title} shared={sharedWithRaw} />
                        </p>
                        {cheapest ? (
                          <p className="mt-1 text-lg font-black tabular-nums text-[#087d8f]">
                            {formatGel(Number(cheapest.currentPrice))} <span className="text-xs font-bold text-[var(--muted)]">({cheapest.shop.name})</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-xs font-bold text-[var(--muted)]">აქტიური შეთავაზება არ აქვს.</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2">
                          {canonical.product?.slug ? (
                            <Link href={`/products/${canonical.product.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-black text-[var(--brand)] underline-offset-2 hover:underline">
                              Public page <ExternalLink className="size-3" />
                            </Link>
                          ) : null}
                          {canonical.offers.map((offer) => (
                            <a key={offer.id} href={offer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--muted-strong)] underline-offset-2 hover:underline">
                              {offer.shop.name} <ExternalLink className="size-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid content-center gap-2">
                      <ReviewRowActions matchId={match.id} />
                      <OpenBothButton
                        storeUrl={raw.originalUrl}
                        publicUrl={canonical.product?.slug ? `/products/${canonical.product.slug}` : null}
                      />
                    </div>
                  </div>
                </article>
              </AdminPanel>
            </div>
          );
        })}
        {!rows.length ? (
          <AdminEmptyState
            title="Review queue ცარიელია"
            description="ამ ფილტრით pending match არ არის. ახალი წყვილები matcher-ის შემდეგ გაშვებაზე გამოჩნდება."
          />
        ) : null}
      </div>

      <ReviewKeyboardNav matchIds={rows.map(({ match }) => match.id)} />
    </AdminShell>
  );
}
