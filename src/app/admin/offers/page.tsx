import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminDebouncedSearch } from "@/components/admin-search";
import {
  AdminEmptyState,
  AdminLoginShell,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminShopAvatar,
  AdminStatusPill,
} from "@/components/admin-ui";
import { UnlinkOfferButton } from "@/components/admin-unlink-button";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatGel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const VIEWS = ["all", "oos", "unlinked", "inactive"] as const;
type OffersView = (typeof VIEWS)[number];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function viewWhere(view: OffersView): Prisma.ProductOfferWhereInput {
  if (view === "oos") return { isActive: true, availability: "OUT_OF_STOCK" };
  if (view === "unlinked") return { isActive: true, canonicalProductId: null };
  if (view === "inactive") return { isActive: false };
  return { isActive: true };
}

export default async function AdminOffersPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  if (!prisma) {
    return (
      <AdminShell>
        <AdminEmptyState title="DATABASE_URL არ არის მითითებული" />
      </AdminShell>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q)?.trim() || undefined;
  const shopSlug = firstParam(params.shop) || undefined;
  const viewParam = firstParam(params.view);
  const view: OffersView = VIEWS.includes(viewParam as OffersView) ? (viewParam as OffersView) : "all";
  const page = Math.max(1, Number(firstParam(params.page)) || 1);

  const where: Prisma.ProductOfferWhereInput = {
    ...viewWhere(view),
    shop: shopSlug ? { slug: shopSlug } : undefined,
    title: q ? { contains: q, mode: "insensitive" } : undefined,
  };
  const shopScope = shopSlug ? { slug: shopSlug } : undefined;

  const [shops, statTotals, total, offers, activeTotal, oosTotal, unlinkedTotal, inactiveTotal] = await Promise.all([
    prisma.shop.findMany({
      where: { offers: { some: { isActive: true } } },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.productOffer.groupBy({
      by: ["shopId"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.productOffer.count({ where }),
    prisma.productOffer.findMany({
      where,
      orderBy: [{ shopId: "asc" }, { lastSeenAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        shop: { select: { name: true, slug: true } },
        canonicalProduct: { select: { id: true, title: true } },
      },
    }),
    prisma.productOffer.count({ where: { isActive: true, shop: shopScope } }),
    prisma.productOffer.count({ where: { isActive: true, availability: "OUT_OF_STOCK", shop: shopScope } }),
    prisma.productOffer.count({ where: { isActive: true, canonicalProductId: null, shop: shopScope } }),
    prisma.productOffer.count({ where: { isActive: false, shop: shopScope } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { q, shop: shopSlug, view: view === "all" ? undefined : view, page: undefined, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const text = next.toString();
    return text ? `/admin/offers?${text}` : "/admin/offers";
  };

  // Rows arrive ordered by shop, so consecutive runs of the same shop form
  // the per-store groups.
  const groups: { shop: { name: string; slug: string }; rows: typeof offers }[] = [];
  for (const offer of offers) {
    const current = groups.at(-1);
    if (current && current.shop.slug === offer.shop.slug) current.rows.push(offer);
    else groups.push({ shop: offer.shop, rows: [offer] });
  }

  const tabs = [
    { view: "all" as const, label: "აქტიური", count: activeTotal },
    { view: "unlinked" as const, label: "მიუბმელი", count: unlinkedTotal },
    { view: "oos" as const, label: "Out of stock", count: oosTotal },
    { view: "inactive" as const, label: "გამორთული", count: inactiveTotal },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        breadcrumbs={[{ label: "ადმინი", href: "/admin" }, { label: "შეთავაზებები" }]}
        title="შეთავაზებები"
        description="ყველა შეთავაზება მაღაზიების მიხედვით. მონიშნულია მიუბმელი (canonical-ის გარეშე) და out-of-stock შეთავაზებები."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="ნაპოვნია" value={total} tone="info" />
        <AdminMetricCard label="Out of stock" value={oosTotal} tone={oosTotal ? "warn" : "good"} />
        <AdminMetricCard label="მიუბმელი" value={unlinkedTotal} tone={unlinkedTotal ? "warn" : "good"} />
      </div>

      <AdminPanel>
        <div className="flex overflow-x-auto border-b border-[#dbe5d3] bg-[#f8fbf4]">
          {tabs.map((tab) => {
            const active = view === tab.view;
            return (
              <Link
                key={tab.view}
                href={query({ view: tab.view === "all" ? undefined : tab.view })}
                className={`relative inline-flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-black transition ${
                  active ? "text-[var(--brand)]" : "text-[var(--muted)] hover:text-[var(--brand)]"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-[#151713] text-white" : "bg-[#e7eede] text-[var(--muted-strong)]"}`}>
                  {tab.count}
                </span>
                {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#151713]" /> : null}
              </Link>
            );
          })}
        </div>
        <div className="grid gap-3 p-4">
          <AdminDebouncedSearch placeholder="ძიება სათაურით…" />
          <div className="flex flex-wrap gap-2">
            <Link
              href={query({ shop: undefined })}
              className={`inline-flex h-10 items-center rounded-2xl px-3 text-xs font-black ${!shopSlug ? "bg-[#151713] text-white" : "border border-[#c8d7bd] bg-white text-[var(--brand)] hover:border-[#151713]"}`}
            >
              ყველა მაღაზია
            </Link>
            {shops.map((shop) => {
              const count = statTotals.find((row) => row.shopId === shop.id)?._count._all ?? 0;
              return (
                <Link
                  key={shop.id}
                  href={query({ shop: shop.slug })}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-2xl px-3 text-xs font-black ${shopSlug === shop.slug ? "bg-[#151713] text-white" : "border border-[#c8d7bd] bg-white text-[var(--brand)] hover:border-[#151713]"}`}
                >
                  {shop.name} <span className="opacity-60">({count})</span>
                </Link>
              );
            })}
          </div>
        </div>
      </AdminPanel>

      {groups.map((group) => (
        <AdminPanel
          key={group.shop.slug}
          title={group.shop.name}
          actions={<AdminStatusPill tone="info">{group.rows.length} ამ გვერდზე</AdminStatusPill>}
        >
          <div className="divide-y divide-[#edf2e8]">
            {group.rows.map((offer) => {
              const unlinked = !offer.canonicalProduct;
              return (
                <div
                  key={offer.id}
                  className={`flex flex-wrap items-center justify-between gap-2 p-4 ${unlinked ? "border-l-4 border-l-[#f59e0b] bg-[#fffbeb]/60" : ""}`}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <AdminShopAvatar name={offer.shop.name} slug={offer.shop.slug} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-black leading-snug text-[var(--brand)]">{offer.title}</p>
                        {unlinked ? <AdminStatusPill tone="warn">მიუბმელი</AdminStatusPill> : null}
                        {offer.availability === "OUT_OF_STOCK" ? <AdminStatusPill tone="danger">out of stock</AdminStatusPill> : null}
                        {!offer.isActive ? <AdminStatusPill>inactive</AdminStatusPill> : null}
                      </div>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                        {formatGel(Number(offer.currentPrice))}
                        {offer.lastPriceChangedAt ? ` — ფასი განახლდა ${formatRelativeTime(offer.lastPriceChangedAt)}` : ""}
                        {` — ბოლოს ნანახი ${formatRelativeTime(offer.lastSeenAt)}`}
                        {offer.canonicalProduct ? ` — ${offer.canonicalProduct.title}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={offer.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#c8d7bd] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#151713]">
                      ნახვა <ExternalLink className="size-3.5" />
                    </a>
                    {offer.canonicalProduct ? <UnlinkOfferButton offerId={offer.id} offerTitle={`${offer.shop.name}: ${offer.title}`} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </AdminPanel>
      ))}
      {!offers.length ? <AdminEmptyState title="შეთავაზება ვერ მოიძებნა" /> : null}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {page > 1 ? (
            <Link href={query({ page: String(page - 1) })} className="inline-flex h-10 items-center rounded-2xl border border-[#c8d7bd] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#151713]">
              წინა
            </Link>
          ) : null}
          <span className="text-sm font-black text-[var(--muted)]">{page} / {totalPages}</span>
          {page < totalPages ? (
            <Link href={query({ page: String(page + 1) })} className="inline-flex h-10 items-center rounded-2xl border border-[#c8d7bd] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#151713]">
              შემდეგი
            </Link>
          ) : null}
        </div>
      ) : null}
    </AdminShell>
  );
}
