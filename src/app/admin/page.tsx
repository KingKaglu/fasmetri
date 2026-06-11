import Link from "next/link";
import { ArrowDownUp, GitCompareArrows, RefreshCw } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import {
  AdminEmptyState,
  AdminLoginShell,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminStatusPill,
} from "@/components/admin-ui";
import { MatcherTriggerButton, StaleOfferCleanupButton } from "@/components/admin-sync-actions";
import { isAdminRequest } from "@/lib/admin-auth";
import { githubConfigured } from "@/lib/admin-sync-status";
import { formatGel, formatUpdated } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SYNC_FRESH_MS = 24 * 60 * 60 * 1000;
const STALE_OFFER_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  if (!prisma) {
    return (
      <AdminShell>
        <AdminEmptyState title="DATABASE_URL არ არის მითითებული" description="ადმინ დაფას სჭირდება მონაცემთა ბაზა." />
      </AdminShell>
    );
  }

  const staleCutoff = new Date(Date.now() - STALE_OFFER_MS);
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
      take: 5,
      select: { id: true, rawTitle: true, candidateTitle: true, confidence: true, status: true, matchedAt: true, shop: { select: { name: true } } },
    }),
    prisma.priceHistory.findMany({
      orderBy: { capturedAt: "desc" },
      take: 5,
      select: { id: true, price: true, oldPrice: true, capturedAt: true, offer: { select: { title: true, shop: { select: { name: true } } } } },
    }),
  ]);

  const shopStatus = shops
    .map((shop) => {
      const group = offersByShop.find((row) => row.shopId === shop.id);
      const lastSeen = group?._max.lastSeenAt ?? null;
      const online = Boolean(lastSeen && Date.now() - lastSeen.getTime() < SYNC_FRESH_MS);
      return { ...shop, offerCount: group?._count._all ?? 0, lastSeen, online };
    })
    .filter((shop) => shop.offerCount > 0)
    .sort((a, b) => b.offerCount - a.offerCount);
  const onlineCount = shopStatus.filter((shop) => shop.online).length;

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
        <Link href="/admin/review" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#151713] hover:bg-[var(--accent)]">
          <GitCompareArrows className="size-4" />
          Review queue ({pendingReview})
        </Link>
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminMetricCard label="პროდუქტები" value={canonicalCount} detail="canonical კატალოგი" tone="info" />
        <AdminMetricCard label="აქტიური შეთავაზებები" value={activeOffers} tone="good" />
        <AdminMetricCard label="Review queue" value={pendingReview} detail="pending match" tone={pendingReview ? "warn" : "good"} />
        <AdminMetricCard label="მარაგი ამოწურულია" value={outOfStock} detail="აქტიური, out of stock" tone={outOfStock ? "warn" : "good"} />
        <AdminMetricCard label="მიუბმელი" value={unlinkedOffers} detail="canonical-ის გარეშე" tone={unlinkedOffers ? "warn" : "good"} />
        <AdminMetricCard label="მაღაზიები" value={`${onlineCount}/${shopStatus.length}`} detail="sync ბოლო 24სთ-ში" tone={onlineCount === shopStatus.length ? "good" : "danger"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <AdminPanel title="მაღაზიების სტატუსი" description="ბოლო sync = ბოლოს ნანახი შეთავაზება ამ მაღაზიიდან.">
          <div className="divide-y divide-[#edf2e8]">
            {shopStatus.map((shop) => (
              <div key={shop.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-black text-[var(--brand)]">{shop.name}</p>
                  <p className="text-xs font-bold text-[var(--muted)]">
                    {shop.offerCount} აქტიური შეთავაზება
                    {shop.lastSeen ? ` — ბოლო sync ${formatUpdated(shop.lastSeen)}` : ""}
                  </p>
                </div>
                <AdminStatusPill tone={shop.online ? "good" : "danger"}>{shop.online ? "online" : "offline"}</AdminStatusPill>
              </div>
            ))}
            {!shopStatus.length ? <div className="p-4"><AdminEmptyState title="აქტიური მაღაზია არ არის" /></div> : null}
          </div>
        </AdminPanel>

        <AdminPanel title="სწრაფი მოქმედებები" description="Sync-ის გაშვება GitHub Actions-ით; გასუფთავება პირდაპირ ბაზაში.">
          <div className="grid gap-3 p-4">
            <Link
              href="/admin/sync"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#c8d7bd] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#151713]"
            >
              <RefreshCw className="size-4" />
              Sync-ის გაშვება მაღაზიების მიხედვით
            </Link>
            {githubConfigured() ? <MatcherTriggerButton /> : null}
            <StaleOfferCleanupButton staleCount={staleOffers} />
            <Link
              href="/admin/offers?view=unlinked"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#c8d7bd] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#151713]"
            >
              <ArrowDownUp className="size-4" />
              მიუბმელი შეთავაზებები ({unlinkedOffers})
            </Link>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="ბოლო აქტივობა" description="ბოლო ფასის ცვლილებები sync-ებიდან და matcher-ის ბოლო გადაწყვეტილებები.">
        {activity.length ? (
          <div className="divide-y divide-[#edf2e8]">
            {activity.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusPill tone={item.kind === "match" ? "info" : "good"}>{item.kind === "match" ? "match" : "price"}</AdminStatusPill>
                    <p className="break-words font-black text-[var(--brand)]">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">{item.detail}</p>
                </div>
                <time className="shrink-0 text-xs font-black text-[var(--muted)]" dateTime={item.at.toISOString()}>
                  {formatUpdated(item.at)}
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
