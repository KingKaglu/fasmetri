import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ExternalLink, Search } from "lucide-react";
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
import { UnlinkOfferButton } from "@/components/admin-unlink-button";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatGel, formatUpdated } from "@/lib/format";
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

  const [shops, statTotals, total, offers] = await Promise.all([
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
  ]);

  const [oosTotal, unlinkedTotal] = await Promise.all([
    prisma.productOffer.count({ where: { isActive: true, availability: "OUT_OF_STOCK", shop: shopSlug ? { slug: shopSlug } : undefined } }),
    prisma.productOffer.count({ where: { isActive: true, canonicalProductId: null, shop: shopSlug ? { slug: shopSlug } : undefined } }),
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

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="offers browser"
        title="შეთავაზებები"
        description="ყველა შეთავაზება მაღაზიების მიხედვით. მონიშნულია მიუბმელი (canonical-ის გარეშე) და out-of-stock შეთავაზებები."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="ნაპოვნია" value={total} tone="info" />
        <AdminMetricCard label="Out of stock" value={oosTotal} tone={oosTotal ? "warn" : "good"} />
        <AdminMetricCard label="მიუბმელი" value={unlinkedTotal} tone={unlinkedTotal ? "warn" : "good"} />
      </div>

      <AdminPanel>
        <div className="grid gap-3 p-4">
          <form action="/admin/offers" className="flex flex-wrap items-center gap-2">
            {shopSlug ? <input type="hidden" name="shop" value={shopSlug} /> : null}
            {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
            <span className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="ძიება სათაურით"
                className="h-11 w-full rounded-2xl border border-[#c8d7bd] bg-white pl-10 pr-3 text-sm font-bold text-[var(--brand)] outline-none focus:border-[#151713]"
              />
            </span>
            <button className="h-11 rounded-2xl bg-[#151713] px-4 text-sm font-black text-white hover:bg-black">ძიება</button>
          </form>
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
          <div className="flex flex-wrap gap-2">
            {[
              { view: "all" as const, label: "აქტიური" },
              { view: "oos" as const, label: "Out of stock" },
              { view: "unlinked" as const, label: "მიუბმელი" },
              { view: "inactive" as const, label: "გამორთული" },
            ].map((filter) => (
              <Link
                key={filter.view}
                href={query({ view: filter.view === "all" ? undefined : filter.view })}
                className={`inline-flex h-10 items-center rounded-2xl px-3 text-xs font-black ${view === filter.view ? "bg-[#151713] text-white" : "border border-[#c8d7bd] bg-white text-[var(--brand)] hover:border-[#151713]"}`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>
      </AdminPanel>

      {groups.map((group) => (
        <AdminPanel key={group.shop.slug} title={group.shop.name} actions={<AdminStatusPill tone="info">{group.rows.length} ამ გვერდზე</AdminStatusPill>}>
          <div className="divide-y divide-[#edf2e8]">
            {group.rows.map((offer) => (
              <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-black leading-snug text-[var(--brand)]">{offer.title}</p>
                    {!offer.canonicalProduct ? <AdminStatusPill tone="warn">მიუბმელი</AdminStatusPill> : null}
                    {offer.availability === "OUT_OF_STOCK" ? <AdminStatusPill tone="danger">out of stock</AdminStatusPill> : null}
                    {!offer.isActive ? <AdminStatusPill>inactive</AdminStatusPill> : null}
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                    {formatGel(Number(offer.currentPrice))} — ბოლოს ნანახი {formatUpdated(offer.lastSeenAt)}
                    {offer.canonicalProduct ? ` — ${offer.canonicalProduct.title}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={offer.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#c8d7bd] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#151713]">
                    ნახვა <ExternalLink className="size-3.5" />
                  </a>
                  {offer.canonicalProduct ? <UnlinkOfferButton offerId={offer.id} offerTitle={`${offer.shop.name}: ${offer.title}`} /> : null}
                </div>
              </div>
            ))}
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
