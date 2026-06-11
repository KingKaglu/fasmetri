import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { BulkApproveForm, ReviewRowActions } from "@/components/admin-review-actions";
import {
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
import { formatGel, formatUpdated } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

  const [matches, totalPending, mobilesPending, laptopsPending] = await Promise.all([
    prisma.possibleMatch.findMany({
      where: { status: "PENDING", canonicalProduct: category ? { categorySlug: category } : undefined },
      orderBy: [{ confidence: "desc" }, { matchedAt: "desc" }],
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
  const rows = matches.filter((match) => match.rawOffer.productOffer?.canonicalProductId !== match.canonicalProductId);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="match review"
        title="Match review queue"
        description="Matcher-მა ეს წყვილები ვერ დაადასტურა ავტომატურად (confidence < 85). შეადარე ორი მხარე და გადაწყვიტე."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="Pending სულ" value={totalPending} tone={totalPending ? "warn" : "good"} />
        <AdminMetricCard label="ტელეფონები" value={mobilesPending} tone="info" />
        <AdminMetricCard label="ლეპტოპები" value={laptopsPending} tone="info" />
      </div>

      <AdminPanel
        title="ფილტრი და bulk მოქმედება"
        description="Bulk დადასტურება ეხება ყველა pending match-ს არჩეულ კატეგორიაში."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/admin/review", label: "ყველა", active: !category },
              { href: "/admin/review?category=mobiles", label: "ტელეფონები", active: category === "mobiles" },
              { href: "/admin/review?category=laptops", label: "ლეპტოპები", active: category === "laptops" },
            ].map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className={`inline-flex h-10 items-center rounded-2xl px-4 text-sm font-black ${
                  filter.active ? "bg-[#151713] text-white" : "border border-[#c8d7bd] bg-white text-[var(--brand)] hover:border-[#151713]"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
          <BulkApproveForm category={category} />
        </div>
      </AdminPanel>

      <div className="grid gap-3">
        {rows.map((match) => {
          const raw = match.rawOffer;
          const canonical = match.canonicalProduct;
          const cheapest = canonical.offers[0];
          return (
            <AdminPanel key={match.id}>
              <article className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusPill tone={match.confidence >= 80 ? "warn" : "danger"}>
                      Confidence {match.confidence}%
                    </AdminStatusPill>
                    <AdminStatusPill tone="info">{canonical.categorySlug}</AdminStatusPill>
                    <AdminStatusPill>{match.shop.name}</AdminStatusPill>
                  </div>
                  <time className="text-xs font-black text-[var(--muted)]" dateTime={match.matchedAt.toISOString()}>
                    {formatUpdated(match.matchedAt)}
                  </time>
                </div>

                <p className="mt-2 rounded-xl border border-[#dbe5d3] bg-[#f8fbf4] px-3 py-2 text-xs font-bold text-[var(--muted-strong)]">{match.reason}</p>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_14rem]">
                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-[1rem] border border-[#dbe5d3] bg-[#f8fbf4] p-3">
                    <div className="overflow-hidden rounded-xl border border-[#dbe5d3] bg-white">
                      <ProductImage src={raw.originalImageUrl} alt={raw.originalTitle} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{match.shop.name} — ახალი შეთავაზება</p>
                      <p className="mt-1 break-words text-sm font-black leading-snug text-[var(--brand)]">{raw.originalTitle}</p>
                      {raw.rawPrice != null ? <p className="mt-1 text-lg font-black tabular-nums text-[#087d8f]">{formatGel(Number(raw.rawPrice))}</p> : null}
                      <a href={raw.originalUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[var(--brand)] underline-offset-2 hover:underline">
                        მაღაზიაში ნახვა <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-[1rem] border border-[#dbe5d3] bg-white p-3">
                    <div className="overflow-hidden rounded-xl border border-[#dbe5d3] bg-[#f8fbf4]">
                      <ProductImage src={canonical.primaryImage} alt={canonical.title} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">არსებული პროდუქტი</p>
                      <p className="mt-1 break-words text-sm font-black leading-snug text-[var(--brand)]">{canonical.title}</p>
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

                  <div className="grid content-center">
                    <ReviewRowActions matchId={match.id} />
                  </div>
                </div>
              </article>
            </AdminPanel>
          );
        })}
        {!rows.length ? (
          <AdminEmptyState
            title="Review queue ცარიელია"
            description="ამ კატეგორიაში pending match არ არის. ახალი წყვილები matcher-ის შემდეგ გაშვებაზე გამოჩნდება."
          />
        ) : null}
      </div>
    </AdminShell>
  );
}
