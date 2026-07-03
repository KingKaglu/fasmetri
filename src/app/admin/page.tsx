import Link from "next/link";
import { ArrowDownUp, GitCompareArrows, PackageSearch, RefreshCw, Tags } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import {
  AdminActionCard,
  AdminEmptyState,
  AdminLoginShell,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminStatusDot,
  AdminStatusPill,
} from "@/components/admin-ui";
import { MatcherTriggerButton, StaleOfferCleanupButton } from "@/components/admin-sync-actions";
import { isAdminRequest } from "@/lib/admin-auth";
import { githubConfigured } from "@/lib/admin-sync-status";
import { formatGel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SYNC_FRESH_MS = 24 * 60 * 60 * 1000;
const SYNC_WARN_MS = 6 * 60 * 60 * 1000;
const STALE_OFFER_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  if (!prisma) {
    return (
      <AdminShell>
        <AdminEmptyState title="DATABASE_URL არ არის მითითებული" description="ადმინ დაფას სჭირდება მონაცემთა ბაზა." />
      </AdminShell>
    );
  }

  const now = Date.now();
  const staleCutoff = new Date(now - STALE_OFFER_MS);
  const weekAgo = new Date(now - WEEK_MS);
  const twoWeeksAgo = new Date(now - 2 * WEEK_MS);

  const [
    canonicalCount,
    activeOffers,
    pendingReview,
    outOfStock,
    unlinkedOffers,
    staleOffers,
    shops,
    offersByShop,
    recentMatches,
    recentPriceChanges,
    productsThisWeek,
    productsLastWeek,
    offersThisWeek,
    offersLastWeek,
    matchesThisWeek,
    matchesLastWeek,
  ] = await Promise.all([
    prisma.canonicalProduct.count(),
    prisma.productOffer.count({ where: { isActive: true } }),
    prisma.possibleMatch.count({ where: { status: "PENDING" } }),
    prisma.productOffer.count({ where: { isActive: true, availability: "OUT_OF_STOCK" } }),
    prisma.productOffer.count({ where: { isActive: true, canonicalProductId: null } }),
    prisma.productOffer.count({ where: { isActive: true, lastSeenAt: { lt: staleCutoff } } }),
    prisma.shop.findMany({ select: { id: true, slug: true, name: true, enabled: true } }),
    prisma.productOffer.groupBy({
      by: ["shopId"],
      where: { isActive: true },
      _count: { _all: true },
      _max: { lastSeenAt: true },
    }),
    prisma.possibleMatch.findMany({
      orderBy: { matchedAt: "desc" },
      take: 6,
      select: { id: true, rawTitle: true, candidateTitle: true, confidence: true, status: true, matchedAt: true, shop: { select: { name: true } } },
    }),
    prisma.priceHistory.findMany({
      orderBy: { capturedAt: "desc" },
      take: 6,
      select: { id: true, price: true, oldPrice: true, capturedAt: true, offer: { select: { title: true, shop: { select: { name: true } } } } },
    }),
    prisma.canonicalProduct.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.canonicalProduct.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.productOffer.count({ where: { firstSeenAt: { gte: weekAgo } } }),
    prisma.productOffer.count({ where: { firstSeenAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.possibleMatch.count({ where: { matchedAt: { gte: weekAgo } } }),
    prisma.possibleMatch.count({ where: { matchedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
  ]);

  const shopStatus = shops
    .map((shop) => {
      const group = offersByShop.find((row) => row.shopId === shop.id);
      const lastSeen = group?._max.lastSeenAt ?? null;
      const age = lastSeen ? now - lastSeen.getTime() : Infinity;
      const tone: "good" | "warn" | "danger" = age < SYNC_WARN_MS ? "good" : age < SYNC_FRESH_MS ? "warn" : "danger";
      return { ...shop, offerCount: group?._count._all ?? 0, lastSeen, tone };
    })
    .filter((shop) => shop.offerCount > 0)
    .sort((a, b) => b.offerCount - a.offerCount);
  const healthyCount = shopStatus.filter((shop) => shop.tone === "good").length;

  const activity = [
    ...recentMatches.map((match) => ({
      id: `match-${match.id}`,
      at: match.matchedAt,
      kind: "match" as const,
      title: match.rawTitle,
      detail: `${match.shop.name} → ${match.candidateTitle} (${match.confidence}%, ${match.status})`,
    })),
    ...recentPriceChanges.map((entry) => ({
      id: `price-${entry.id}`,
      at: entry.capturedAt,
      kind: "sync" as const,
      title: entry.offer.title,
      detail: `${entry.offer.shop.name} — ფასი ${formatGel(Number(entry.price))}${entry.oldPrice ? ` (ძველი ${formatGel(Number(entry.oldPrice))})` : ""}`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="operations dashboard"
        title="საიტის მართვა"
        description="კატალოგი, sync-ის ჯანმრთელობა და review queue ერთ ეკრანზე."
      >
        <Link href="/admin/review" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#0a0a0a] hover:bg-white/85">
          <GitCompareArrows className="size-4" />
          Review queue ({pendingReview})
        </Link>
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminMetricCard
          label="პროდუქტები"
          value={canonicalCount}
          detail="canonical კატალოგი"
          tone="info"
          trend={{ delta: productsThisWeek - productsLastWeek, label: "კვირასთან" }}
        />
        <AdminMetricCard
          label="აქტიური შეთავაზებები"
          value={activeOffers}
          tone="good"
          trend={{ delta: offersThisWeek - offersLastWeek, label: "კვირასთან" }}
        />
        <AdminMetricCard
          label="Review queue"
          value={pendingReview}
          detail="pending match"
          tone={pendingReview ? "warn" : "good"}
          trend={{ delta: matchesThisWeek - matchesLastWeek, label: "კვირასთან", downIsGood: true }}
        />
        <AdminMetricCard label="მარაგი ამოწურულია" value={outOfStock} detail="აქტიური, out of stock" tone={outOfStock ? "warn" : "good"} />
        <AdminMetricCard label="მიუბმელი" value={unlinkedOffers} detail="canonical-ის გარეშე" tone={unlinkedOffers ? "warn" : "good"} />
        <AdminMetricCard label="მაღაზიები" value={`${healthyCount}/${shopStatus.length}`} detail="sync ბოლო 6სთ-ში" tone={healthyCount === shopStatus.length ? "good" : "danger"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminActionCard
          href="/admin/review"
          icon={<GitCompareArrows className="size-5" />}
          title="Match review"
          description="დაადასტურე ან უარყავი matcher-ის წყვილები"
          badge={pendingReview ? <AdminStatusPill tone="warn">{pendingReview}</AdminStatusPill> : <AdminStatusPill tone="good">სუფთაა</AdminStatusPill>}
        />
        <AdminActionCard
          href="/admin/sync"
          icon={<RefreshCw className="size-5" />}
          title="Sync-ის გაშვება"
          description="ფასების ან სრული სინქი მაღაზიების მიხედვით"
        />
        <AdminActionCard
          href="/admin/offers?view=unlinked"
          icon={<ArrowDownUp className="size-5" />}
          title="მიუბმელი შეთავაზებები"
          description="შეთავაზებები canonical პროდუქტის გარეშე"
          badge={unlinkedOffers ? <AdminStatusPill tone="warn">{unlinkedOffers}</AdminStatusPill> : null}
        />
        <AdminActionCard
          href="/admin/products"
          icon={<PackageSearch className="size-5" />}
          title="კატალოგის დათვალიერება"
          description="canonical პროდუქტები მიბმული შეთავაზებებით"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <AdminPanel title="მაღაზიების სტატუსი" description="🟢 sync ბოლო 6სთ-ში · 🟡 ბოლო 24სთ-ში · 🔴 24სთ+">
          <div className="divide-y divide-[#ededee]">
            {shopStatus.map((shop) => (
              <div key={shop.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <AdminStatusDot tone={shop.tone} pulse={shop.tone !== "good"} />
                    <p className="font-black text-[var(--brand)]">{shop.name}</p>
                  </div>
                  <p className="mt-0.5 pl-5 text-xs font-bold text-[var(--muted)]">
                    {shop.offerCount} აქტიური შეთავაზება
                    {shop.lastSeen ? ` — ბოლო sync ${formatRelativeTime(shop.lastSeen)}` : ""}
                  </p>
                </div>
                <Link href={`/admin/shops/${shop.slug}`} className="text-xs font-black text-[var(--muted)] underline-offset-2 hover:text-[var(--brand)] hover:underline">
                  დეტალები
                </Link>
              </div>
            ))}
            {!shopStatus.length ? <div className="p-4"><AdminEmptyState title="აქტიური მაღაზია არ არის" /></div> : null}
          </div>
        </AdminPanel>

        <AdminPanel title="სწრაფი მოქმედებები" description="Sync-ის გაშვება GitHub Actions-ით; გასუფთავება პირდაპირ ბაზაში.">
          <div className="grid gap-3 p-4">
            {githubConfigured() ? <MatcherTriggerButton /> : null}
            <StaleOfferCleanupButton staleCount={staleOffers} />
            <Link
              href="/admin/offers?view=oos"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#e4e4e7] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#0a0a0a]"
            >
              <Tags className="size-4" />
              Out-of-stock შეთავაზებები ({outOfStock})
            </Link>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="ბოლო აქტივობა" description="ბოლო ფასის ცვლილებები sync-ებიდან და matcher-ის ბოლო გადაწყვეტილებები.">
        {activity.length ? (
          <div className="divide-y divide-[#ededee]">
            {activity.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusPill tone={item.kind === "match" ? "info" : "good"}>{item.kind === "match" ? "match" : "price"}</AdminStatusPill>
                    <p className="break-words font-black text-[var(--brand)]">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">{item.detail}</p>
                </div>
                <time className="shrink-0 text-xs font-black text-[var(--muted)]" dateTime={item.at.toISOString()} title={item.at.toISOString()}>
                  {formatRelativeTime(item.at)}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4"><AdminEmptyState title="აქტივობა ჯერ არ არის" /></div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
