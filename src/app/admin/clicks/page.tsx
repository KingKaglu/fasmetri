import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Clock3, ExternalLink, Globe2, MousePointerClick, PackageSearch, Store } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminProductThumb } from "@/components/admin-product-thumb";
import { AdminEmptyState, AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatGel, formatUpdated } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tbilisi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type ClickRow = {
  id: string;
  offerId: string | null;
  targetUrl: string;
  shopName: string | null;
  category: string | null;
  productName: string | null;
  productId: string | null;
  price: Prisma.Decimal | null;
  referrer: string | null;
  createdAt: Date;
  offer: {
    title: string;
    url: string;
    imageUrl: string | null;
    shop: { name: string; slug: string };
    product: { name: string; slug: string };
  } | null;
};

export default async function AdminClicksPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;

  let rows: ClickRow[] | null = null;
  let error: string | null = null;
  if (!prisma) {
    error = "DATABASE_URL not configured.";
  } else {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    try {
      rows = await prisma.clickEvent.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          offerId: true,
          targetUrl: true,
          shopName: true,
          category: true,
          productName: true,
          productId: true,
          price: true,
          referrer: true,
          createdAt: true,
          offer: {
            select: {
              title: true,
              url: true,
              imageUrl: true,
              shop: { select: { name: true, slug: true } },
              product: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
    } catch {
      error =
        "ClickEvent reporting columns are missing. Apply the migration (npm run db:deploy) or run the ALTER TABLE from prisma/migrations/20260530150000_clickevent_reporting.";
    }
  }

  const byShop = tally(rows, (r) => r.shopName ?? "(unknown)");
  const bySite = tally(rows, (r) => targetHost(r.targetUrl));
  const byCategory = tally(rows, (r) => r.category ?? "(unknown)");
  const byProduct = tally(rows, (r) => clickProductTitle(r)).slice(0, 25);
  const byDay = tally(rows, (r) => dayFormatter.format(r.createdAt)).sort((a, b) => b.key.localeCompare(a.key));
  const recentRows = rows?.slice(0, 50) ?? [];

  return (
    <AdminShell>
      <AdminPageHeader
        breadcrumbs={[{ label: "ადმინი", href: "/admin" }, { label: "კლიკები" }]}
        title="გადასვლების ანგარიში"
        description={`პირველი მხარის shop_click მონაცემები ბოლო 30 დღეში${rows ? ` - სულ ${rows.length} გადასვლა` : ""}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AdminMetricCard label="გადასვლები" value={rows?.length ?? 0} tone="info" detail="ბოლო 30 დღე" />
        <AdminMetricCard label="მაღაზია" value={byShop.length} detail={byShop[0]?.key ?? "ჯერ არ არის"} />
        <AdminMetricCard label="საიტი" value={bySite.length} detail={bySite[0]?.key ?? "target domain"} />
        <AdminMetricCard label="კატეგორია" value={byCategory.length} />
        <AdminMetricCard label="ტოპ პროდუქტი" value={byProduct[0]?.count ?? 0} tone="good" detail={byProduct[0]?.key ?? "ჯერ არ არის"} />
      </div>

      {error ? (
        <div className="rounded-[1rem] border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm font-bold text-[#c2410c]">{error}</div>
      ) : (
        <>
          <RecentClicks rows={recentRows} total={rows?.length ?? 0} />
          <div className="grid gap-5 lg:grid-cols-2">
            <ReportTable title="საიტის მიხედვით" head="საიტი" rows={bySite} />
            <ReportTable title="მაღაზიის მიხედვით" head="მაღაზია" rows={byShop} />
            <ReportTable title="კატეგორიის მიხედვით" head="კატეგორია" rows={byCategory} />
            <ReportTable title="დღის მიხედვით" head="თარიღი" rows={byDay} />
            <ReportTable title="პროდუქტის მიხედვით (ტოპ 25)" head="პროდუქტი" rows={byProduct} />
          </div>
        </>
      )}
    </AdminShell>
  );
}

function RecentClicks({ rows, total }: { rows: ClickRow[]; total: number }) {
  return (
    <AdminPanel
      title="ბოლო გადასვლები"
      description="აქ ჩანს რომელ საიტზე და კონკრეტულად რომელ პროდუქტზე გადავიდა მომხმარებელი."
      actions={<AdminStatusPill tone="info">{Math.min(rows.length, total)} / {total}</AdminStatusPill>}
    >
      {rows.length ? (
        <div className="divide-y divide-[#ededee]">
          {rows.map((row) => {
            const productTitle = clickProductTitle(row);
            const shopName = row.shopName ?? row.offer?.shop.name ?? "უცნობი მაღაზია";
            const host = targetHost(row.targetUrl);
            const price = row.price == null ? null : formatGel(Number(row.price));
            const productSlug = row.offer?.product.slug;

            return (
              <article key={row.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aqua-soft)] px-2.5 py-1 text-[11px] font-black text-[#087d8f]">
                      <MousePointerClick className="size-3.5" />
                      click
                    </span>
                    {row.category ? <AdminStatusPill>{row.category}</AdminStatusPill> : null}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <AdminProductThumb src={row.offer?.imageUrl} alt={productTitle} size={48} />
                    <h2 className="min-w-0 break-words text-lg font-black leading-snug text-[var(--brand)]">{productTitle}</h2>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                    {productSlug ? (
                      <Link href={`/products/${productSlug}`} target="_blank" className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#e4e4e7] bg-[#fafafa] px-3 text-[var(--brand)] hover:border-[#0a0a0a]">
                        <PackageSearch className="size-3.5" />
                        Public product
                      </Link>
                    ) : null}
                    <a href={row.targetUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 max-w-full items-center gap-1 rounded-2xl bg-[#0a0a0a] px-3 text-white hover:bg-black">
                      <span className="truncate">მაღაზიაში ნახვა</span>
                      <ExternalLink className="size-3.5 text-[var(--accent)]" />
                    </a>
                  </div>
                </div>

                <div className="grid gap-2 rounded-2xl border border-[#ededee] bg-[#fafafa] p-3">
                  <p className="inline-flex min-w-0 items-center gap-2 text-sm font-black text-[var(--brand)]">
                    <Store className="size-4 shrink-0 text-[var(--accent-strong)]" />
                    <span className="truncate">{shopName}</span>
                  </p>
                  <p className="inline-flex min-w-0 items-center gap-2 text-xs font-bold text-[var(--muted)]">
                    <Globe2 className="size-4 shrink-0" />
                    <span className="truncate">{host}</span>
                  </p>
                  {price ? <p className="text-xl font-black tabular-nums text-[#087d8f]">{price}</p> : null}
                  {row.referrer ? <p className="truncate text-[11px] font-bold text-[var(--muted)]">from: {displayReferrer(row.referrer)}</p> : null}
                </div>

                <div className="flex items-center gap-2 text-xs font-black text-[var(--muted)] md:justify-end">
                  <Clock3 className="size-4" />
                  <time dateTime={row.createdAt.toISOString()}>{formatUpdated(row.createdAt)}</time>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-4">
          <AdminEmptyState title="გადასვლები ჯერ არ არის" description="როცა მომხმარებელი მაღაზიის ღილაკს დააჭერს, აქ გამოჩნდება საიტი, პროდუქტი, ფასი და დრო." />
        </div>
      )}
    </AdminPanel>
  );
}

function tally(rows: ClickRow[] | null, key: (row: ClickRow) => string) {
  if (!rows) return [] as { key: string; count: number }[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

function clickProductTitle(row: ClickRow) {
  return row.offer?.title ?? row.productName ?? row.offer?.product.name ?? row.productId ?? "(unknown)";
}

function targetHost(targetUrl: string) {
  try {
    return new URL(targetUrl).hostname.replace(/^www\./, "");
  } catch {
    return "(unknown)";
  }
}

function displayReferrer(referrer: string) {
  try {
    const url = new URL(referrer);
    return `${url.pathname}${url.search}`;
  } catch {
    return referrer;
  }
}

function ReportTable({ title, head, rows }: { title: string; head: string; rows: { key: string; count: number }[] }) {
  return (
    <AdminPanel title={title}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="bg-[#fafafa]">
              <tr className="text-left text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                <th className="px-4 py-3">{head}</th>
                <th className="px-4 py-3 text-right">გადასვლები</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-[#ededee]">
                  <td className="max-w-0 truncate px-4 py-3 font-bold text-[var(--brand)]">{row.key}</td>
                  <td className="px-4 py-3 text-right font-black tabular-nums text-[var(--brand)]">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4">
          <AdminEmptyState title="მონაცემები ჯერ არ არის" />
        </div>
      )}
    </AdminPanel>
  );
}
