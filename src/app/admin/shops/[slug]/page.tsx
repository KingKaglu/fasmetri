import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, GitCompareArrows, RefreshCw } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { ShopEditor } from "@/components/admin-metadata-editors";
import { ReviewRowActions } from "@/components/admin-review-actions";
import { AdminShopActions } from "@/components/admin-shop-actions";
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
import { isAdminRequest } from "@/lib/admin-auth";
import { formatGel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STALE_OFFER_MS = 7 * 24 * 60 * 60 * 1000;

const MATCH_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "დადასტურებული",
  SAFE_AUTO: "ავტო-მატჩი",
  CANONICAL_CREATED: "ახალი canonical",
  UNVERIFIED: "შეუმოწმებელი",
  REJECTED: "უარყოფილი",
  NEEDS_REVIEW: "საჭიროებს განხილვას",
};

function syncTone(status: string): "good" | "warn" | "danger" {
  if (status === "success") return "good";
  if (status === "partial") return "warn";
  return "danger";
}

export default async function AdminShopDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  if (!prisma) {
    return (
      <AdminShell>
        <AdminEmptyState title="DATABASE_URL არ არის მითითებული" description="ადმინ დაფას სჭირდება მონაცემთა ბაზა." />
      </AdminShell>
    );
  }

  const { slug } = await params;
  const shop = await prisma.shop.findUnique({ where: { slug } });
  if (!shop) notFound();

  const staleCutoff = new Date(Date.now() - STALE_OFFER_MS);

  const [
    activeOffers,
    onSale,
    outOfStock,
    staleOffers,
    pendingCount,
    matchStatusGroups,
    categoryRows,
    syncLogs,
    pendingMatches,
    priceChanges,
    newestOffers,
  ] = await Promise.all([
    prisma.productOffer.count({ where: { shopId: shop.id, isActive: true } }),
    prisma.productOffer.count({ where: { shopId: shop.id, isActive: true, isOnSale: true } }),
    prisma.productOffer.count({ where: { shopId: shop.id, isActive: true, availability: "OUT_OF_STOCK" } }),
    prisma.productOffer.count({ where: { shopId: shop.id, isActive: true, lastSeenAt: { lt: staleCutoff } } }),
    prisma.possibleMatch.count({ where: { shopId: shop.id, status: "PENDING" } }),
    prisma.productOffer.groupBy({
      by: ["matchStatus"],
      where: { shopId: shop.id, isActive: true },
      _count: { _all: true },
      orderBy: { _count: { matchStatus: "desc" } },
    }),
    prisma.productOffer.findMany({
      where: { shopId: shop.id, isActive: true },
      select: {
        currentPrice: true,
        product: { select: { category: { select: { slug: true, nameKa: true } } } },
      },
    }),
    prisma.syncLog.findMany({
      where: { store: shop.slug },
      orderBy: { completedAt: "desc" },
      take: 14,
    }),
    prisma.possibleMatch.findMany({
      where: { shopId: shop.id, status: "PENDING" },
      orderBy: { confidence: "desc" },
      take: 8,
      select: {
        id: true,
        rawTitle: true,
        candidateTitle: true,
        confidence: true,
        reason: true,
        matchedAt: true,
        rawOffer: { select: { originalUrl: true } },
      },
    }),
    prisma.priceHistory.findMany({
      where: { offer: { shopId: shop.id } },
      orderBy: { capturedAt: "desc" },
      take: 10,
      select: {
        id: true,
        price: true,
        oldPrice: true,
        capturedAt: true,
        offer: { select: { title: true, url: true } },
      },
    }),
    prisma.productOffer.findMany({
      where: { shopId: shop.id, isActive: true },
      orderBy: { firstSeenAt: "desc" },
      take: 6,
      select: { id: true, title: true, url: true, currentPrice: true, firstSeenAt: true, matchStatus: true },
    }),
  ]);

  // Category breakdown with price ranges, aggregated in JS (a few hundred rows max).
  const categoryMap = new Map<string, { name: string; count: number; min: number; max: number }>();
  for (const row of categoryRows) {
    const key = row.product.category?.slug ?? "—";
    const name = row.product.category?.nameKa ?? "კატეგორიის გარეშე";
    const price = Number(row.currentPrice);
    const entry = categoryMap.get(key);
    if (!entry) {
      categoryMap.set(key, { name, count: 1, min: price, max: price });
    } else {
      entry.count += 1;
      if (price < entry.min) entry.min = price;
      if (price > entry.max) entry.max = price;
    }
  }
  const categories = [...categoryMap.values()].sort((a, b) => b.count - a.count);

  const lastSync = syncLogs[0] ?? null;

  return (
    <AdminShell>
      <AdminPageHeader
        breadcrumbs={[{ label: "ადმინი", href: "/admin" }, { label: "მაღაზიები", href: "/admin/shops" }, { label: shop.name }]}
        title={shop.name}
        description={`${shop.slug} — ${shop.baseUrl}`}
      >
        <a
          href={shop.baseUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/25 px-4 text-sm font-black text-white hover:border-white"
        >
          <ExternalLink className="size-4" />
          საიტზე გადასვლა
        </a>
        <Link
          href={`/admin/review?shop=${shop.slug}`}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#0a0a0a] hover:bg-white/85"
        >
          <GitCompareArrows className="size-4" />
          Review ({pendingCount})
        </Link>
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminMetricCard label="აქტიური შეთავაზება" value={activeOffers} tone="info" />
        <AdminMetricCard label="აქციაზეა" value={onSale} tone={onSale ? "good" : "neutral"} />
        <AdminMetricCard label="მარაგი ამოწურულია" value={outOfStock} tone={outOfStock ? "warn" : "good"} />
        <AdminMetricCard label="მოძველებული (7დღე+)" value={staleOffers} tone={staleOffers ? "warn" : "good"} detail="lastSeen 7 დღეზე ძველი" />
        <AdminMetricCard label="Pending match" value={pendingCount} tone={pendingCount ? "warn" : "good"} />
        <AdminMetricCard
          label="ბოლო sync"
          value={lastSync ? formatRelativeTime(lastSync.completedAt) : "—"}
          detail={lastSync ? `${lastSync.category} · ${lastSync.runType} · ${lastSync.status}` : "sync ჯერ არ დაფიქსირებულა"}
          tone={lastSync ? syncTone(lastSync.status) : "neutral"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <AdminPanel title="Sync ისტორია" description="ბოლო გაშვებები GitHub Actions-იდან (SyncLog).">
          {syncLogs.length ? (
            <div className="divide-y divide-[#ededee]">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusPill tone={syncTone(log.status)}>{log.status}</AdminStatusPill>
                    <span className="text-sm font-black text-[var(--brand)]">{log.category}</span>
                    <span className="text-xs font-bold text-[var(--muted)]">{log.runType}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--muted)]">
                    <span className="tabular-nums">ნახულია {log.offersScraped} · განახლდა {log.offersUpdated}</span>
                    <time dateTime={log.completedAt.toISOString()} title={log.completedAt.toISOString()} className="font-black text-[var(--muted-strong)]">
                      {formatRelativeTime(log.completedAt)}
                    </time>
                  </div>
                  {log.errorMessage ? (
                    <p className="w-full text-xs font-bold text-[var(--danger)]">{log.errorMessage}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <AdminEmptyState title="Sync ჯერ არ დაფიქსირებულა" description="ლოგები გამოჩნდება პირველი workflow გაშვების შემდეგ." />
            </div>
          )}
        </AdminPanel>

        <div className="grid content-start gap-5">
          <AdminPanel title="მოქმედებები" description="ჩართვა/გამორთვა, sync-ის გაშვება და ინფოს რედაქტირება.">
            <div className="grid gap-3 p-4">
              <AdminShopActions id={shop.id} enabled={shop.enabled} needsConfiguration={shop.needsConfiguration} />
              <ShopEditor
                shop={{
                  id: shop.id,
                  slug: shop.slug,
                  name: shop.name,
                  baseUrl: shop.baseUrl,
                  logoUrl: shop.logoUrl,
                  enabled: shop.enabled,
                  reliabilityLabel: shop.reliabilityLabel,
                  needsConfiguration: shop.needsConfiguration,
                }}
              />
              <Link
                href="/admin/sync"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#e4e4e7] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#0a0a0a]"
              >
                <RefreshCw className="size-4" />
                Sync პანელი
              </Link>
            </div>
          </AdminPanel>

          <AdminPanel title="Match სტატუსები" description="აქტიური შეთავაზებების განაწილება.">
            <div className="grid gap-2 p-4">
              {matchStatusGroups.map((group) => (
                <div key={group.matchStatus} className="flex items-center justify-between rounded-xl border border-[#ededee] bg-[#fafafa] px-3 py-2">
                  <span className="text-sm font-black text-[var(--brand)]">
                    {MATCH_STATUS_LABELS[group.matchStatus] ?? group.matchStatus}
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{group.matchStatus}</span>
                  </span>
                  <span className="text-sm font-black tabular-nums text-[var(--muted-strong)]">{group._count._all}</span>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel title="კატეგორიები" description="აქტიური შეთავაზებები კატეგორიების მიხედვით, ფასის დიაპაზონით.">
          {categories.length ? (
            <div className="divide-y divide-[#ededee]">
              {categories.map((category) => (
                <div key={category.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-sm font-black text-[var(--brand)]">{category.name}</span>
                  <span className="text-xs font-bold tabular-nums text-[var(--muted)]">
                    {category.count} შეთავაზება · {formatGel(category.min)} – {formatGel(category.max)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4"><AdminEmptyState title="აქტიური შეთავაზება არ არის" /></div>
          )}
        </AdminPanel>

        <AdminPanel title="ბოლო ფასის ცვლილებები" description="PriceHistory ამ მაღაზიის შეთავაზებებზე.">
          {priceChanges.length ? (
            <div className="divide-y divide-[#ededee]">
              {priceChanges.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <a href={entry.offer.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-black text-[var(--brand)] hover:underline">
                    {entry.offer.title}
                  </a>
                  <div className="flex shrink-0 items-center gap-3 text-xs font-bold text-[var(--muted)]">
                    <span className="tabular-nums text-[var(--muted-strong)]">
                      {formatGel(Number(entry.price))}
                      {entry.oldPrice ? <span className="ml-1.5 text-[var(--muted)] line-through">{formatGel(Number(entry.oldPrice))}</span> : null}
                    </span>
                    <time dateTime={entry.capturedAt.toISOString()}>{formatRelativeTime(entry.capturedAt)}</time>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4"><AdminEmptyState title="ფასის ცვლილება არ დაფიქსირებულა" /></div>
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title={`Pending match-ები (${pendingCount})`}
        description="დაადასტურე ან უარყავი პირდაპირ აქედან — სრული სია review queue-შია."
        actions={
          <Link href={`/admin/review?shop=${shop.slug}`} className="text-xs font-black text-[var(--muted-strong)] underline-offset-2 hover:underline">
            სრული queue →
          </Link>
        }
      >
        {pendingMatches.length ? (
          <div className="divide-y divide-[#ededee]">
            {pendingMatches.map((match) => (
              <div key={match.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={match.rawOffer.originalUrl} target="_blank" rel="noreferrer" className="break-words text-sm font-black text-[var(--brand)] hover:underline">
                      {match.rawTitle}
                    </a>
                    <ExternalLink className="size-3.5 shrink-0 text-[var(--muted)]" />
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">→ {match.candidateTitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <AdminConfidenceBar value={match.confidence} />
                    <span className="text-[11px] font-bold text-[var(--muted)]">{match.reason}</span>
                    <time className="text-[11px] font-bold text-[var(--muted)]" dateTime={match.matchedAt.toISOString()}>
                      {formatRelativeTime(match.matchedAt)}
                    </time>
                  </div>
                </div>
                <ReviewRowActions matchId={match.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4"><AdminEmptyState title="Pending match არ არის" description="ამ მაღაზიის queue სუფთაა. 🎉" /></div>
        )}
      </AdminPanel>

      <AdminPanel title="ბოლოს დამატებული შეთავაზებები" description="უახლესი აქტიური შეთავაზებები (firstSeenAt).">
        {newestOffers.length ? (
          <div className="divide-y divide-[#ededee]">
            {newestOffers.map((offer) => (
              <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <a href={offer.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-black text-[var(--brand)] hover:underline">
                  {offer.title}
                </a>
                <div className="flex shrink-0 items-center gap-3 text-xs font-bold text-[var(--muted)]">
                  <AdminStatusPill tone={offer.matchStatus === "CONFIRMED" || offer.matchStatus === "SAFE_AUTO" || offer.matchStatus === "CANONICAL_CREATED" ? "good" : "warn"}>
                    {MATCH_STATUS_LABELS[offer.matchStatus] ?? offer.matchStatus}
                  </AdminStatusPill>
                  <span className="tabular-nums text-[var(--muted-strong)]">{formatGel(Number(offer.currentPrice))}</span>
                  <time dateTime={offer.firstSeenAt.toISOString()}>{formatRelativeTime(offer.firstSeenAt)}</time>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4"><AdminEmptyState title="შეთავაზება არ არის" /></div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
