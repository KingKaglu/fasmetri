import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminEmptyState, AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const MAX_ROWS = 20000;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tbilisi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type SearchRow = {
  query: string;
  normalized: string;
  resultsCount: number;
  hasResults: boolean;
  source: string;
  category: string | null;
  createdAt: Date;
};

type StockRow = { query: string; normalized: string; email: string; createdAt: Date };

export default async function AdminSearchesPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;

  let rows: SearchRow[] | null = null;
  let stockRequests: StockRow[] = [];
  let error: string | null = null;

  if (!prisma) {
    error = "DATABASE_URL not configured.";
  } else {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    try {
      [rows, stockRequests] = await Promise.all([
        prisma.searchQuery.findMany({
          where: { createdAt: { gte: since } },
          select: { query: true, normalized: true, resultsCount: true, hasResults: true, source: true, category: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: MAX_ROWS,
        }),
        prisma.stockRequest.findMany({
          where: { createdAt: { gte: since } },
          select: { query: true, normalized: true, email: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);
    } catch {
      error =
        "SearchQuery tables are missing. Apply the migration (npm run db:deploy) or run prisma/migrations/20260919000000_add_search_query_log/migration.sql.";
    }
  }

  const all = rows ?? [];
  const submitted = all.filter((row) => row.source === "search");
  const failed = submitted.filter((row) => !row.hasResults);
  const autocompleteMisses = all.filter((row) => row.source === "suggest");
  const failureRate = submitted.length ? Math.round((failed.length / submitted.length) * 100) : 0;

  const topFailed = tally(failed);
  const topAll = tally(submitted);
  const topSuggestMisses = tally(autocompleteMisses);
  const byDay = groupCount(submitted, (row) => dayFormatter.format(row.createdAt)).sort((a, b) => b.key.localeCompare(a.key));
  const topStock = groupCount(stockRequests, (row) => row.query.trim().toLowerCase());

  return (
    <AdminShell>
      <AdminPageHeader
        breadcrumbs={[{ label: "ადმინი", href: "/admin" }, { label: "ძებნები" }]}
        title="ძებნის ანგარიში"
        description={`პირველი მხარის ძებნის მონაცემები ბოლო ${WINDOW_DAYS} დღეში — უშედეგო ძებნა კატალოგის სამუშაო სიაა.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AdminMetricCard label="ძებნები" value={submitted.length} tone="info" detail={`ბოლო ${WINDOW_DAYS} დღე`} />
        <AdminMetricCard
          label="უშედეგო"
          value={failed.length}
          tone={failureRate >= 25 ? "danger" : "neutral"}
          detail={`${failureRate}% ძებნებისა`}
        />
        <AdminMetricCard label="უნიკალური ტერმინი" value={topAll.length} />
        <AdminMetricCard label="ავტოშევსების ჩავარდნა" value={autocompleteMisses.length} detail="prefix-ი უშედეგოდ" />
        <AdminMetricCard
          label="მოთხოვნილი პროდუქტი"
          value={stockRequests.length}
          tone={stockRequests.length ? "good" : "neutral"}
          detail={topStock[0]?.key ?? "ჯერ არ არის"}
        />
      </div>

      {error ? (
        <div className="rounded-[1rem] border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm font-bold text-[#c2410c]">{error}</div>
      ) : (
        <>
          <AdminPanel
            title="უშედეგო ძებნები"
            description="რასაც ხალხი ეძებს და ვერ პოულობს. ყველაზე ღირებული სია საიტზე — ზემოდან ქვემოთ, ეს არის რიგი რა დავამატოთ."
            actions={<AdminStatusPill tone={failed.length ? "danger" : "good"}>{failed.length}</AdminStatusPill>}
          >
            <QueryTable rows={topFailed} emptyTitle="უშედეგო ძებნა არ ყოფილა" failed />
          </AdminPanel>

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminPanel title="ტოპ ძებნები" description="ყველა გაგზავნილი ძებნა, სიხშირის მიხედვით.">
              <QueryTable rows={topAll.slice(0, 30)} emptyTitle="ძებნები ჯერ არ არის" />
            </AdminPanel>

            <AdminPanel
              title="ავტოშევსების ჩავარდნები"
              description="prefix-ები, რომლებზეც type-ahead-მა ვერაფერი შესთავაზა. ეს მაშინაც ჩაიწერება, როცა მომხმარებელი ძებნას საერთოდ არ აგზავნის."
            >
              <QueryTable rows={topSuggestMisses.slice(0, 30)} emptyTitle="ჩავარდნა არ ყოფილა" />
            </AdminPanel>

            <AdminPanel title="დღის მიხედვით">
              <CountTable head="თარიღი" rows={byDay} />
            </AdminPanel>

            <AdminPanel
              title="„შემატყობინე“ მოთხოვნები"
              description="უშედეგო ძებნიდან დატოვებული ელფოსტები — ესენი უკვე მზა მყიდველები არიან."
            >
              <CountTable head="პროდუქტი" rows={topStock} />
            </AdminPanel>
          </div>
        </>
      )}
    </AdminShell>
  );
}

// Group by the normalized form (so "აიფონი 15" and "iPhone 15" are one row) but
// display the most recent raw spelling, which is what a human recognises.
function tally(rows: SearchRow[]) {
  const groups = new Map<string, { key: string; count: number; lastSeen: Date; category: string | null }>();
  for (const row of rows) {
    const existing = groups.get(row.normalized);
    if (existing) {
      existing.count += 1;
      if (row.createdAt > existing.lastSeen) {
        existing.lastSeen = row.createdAt;
        existing.key = row.query;
      }
    } else {
      groups.set(row.normalized, { key: row.query, count: 1, lastSeen: row.createdAt, category: row.category });
    }
  }
  return [...groups.values()].sort((left, right) => right.count - left.count);
}

function groupCount<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

function QueryTable({
  rows,
  emptyTitle,
  failed = false,
}: {
  rows: { key: string; count: number; lastSeen: Date }[];
  emptyTitle: string;
  failed?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="p-4">
        <AdminEmptyState title={emptyTitle} />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-sm">
        <thead className="bg-[#fafafa]">
          <tr className="text-left text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
            <th className="px-4 py-3">ძებნა</th>
            <th className="px-4 py-3 text-right">რაოდენობა</th>
            <th className="px-4 py-3 text-right">ბოლოს</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-[#ededee]">
              <td className="max-w-0 truncate px-4 py-3 font-bold text-[var(--brand)]">
                <Link
                  href={`/search?q=${encodeURIComponent(row.key)}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 hover:text-[var(--accent)]"
                >
                  {failed ? <SearchX className="size-3.5 shrink-0 text-[#c2410c]" /> : <Search className="size-3.5 shrink-0 text-[var(--muted)]" />}
                  <span className="truncate">{row.key}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-black tabular-nums text-[var(--brand)]">{row.count}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-[var(--muted)]">
                {dayFormatter.format(row.lastSeen)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountTable({ head, rows }: { head: string; rows: { key: string; count: number }[] }) {
  if (!rows.length) {
    return (
      <div className="p-4">
        <AdminEmptyState title="მონაცემები ჯერ არ არის" />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[24rem] text-sm">
        <thead className="bg-[#fafafa]">
          <tr className="text-left text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
            <th className="px-4 py-3">{head}</th>
            <th className="px-4 py-3 text-right">რაოდენობა</th>
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
  );
}
