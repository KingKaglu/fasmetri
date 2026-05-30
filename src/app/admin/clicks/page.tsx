import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tbilisi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type ClickRow = {
  shopName: string | null;
  category: string | null;
  productName: string | null;
  productId: string | null;
  createdAt: Date;
};

export default async function AdminClicksPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;

  let rows: ClickRow[] | null = null;
  let error: string | null = null;
  if (!prisma) {
    error = "DATABASE_URL not configured.";
  } else {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    try {
      rows = await prisma.clickEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { shopName: true, category: true, productName: true, productId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
    } catch {
      error =
        "ClickEvent reporting columns are missing. Apply the migration (npm run db:deploy) or run the ALTER TABLE from prisma/migrations/20260530150000_clickevent_reporting.";
    }
  }

  const byShop = tally(rows, (r) => r.shopName ?? "(unknown)");
  const byCategory = tally(rows, (r) => r.category ?? "(unknown)");
  const byProduct = tally(rows, (r) => r.productName ?? r.productId ?? "(unknown)").slice(0, 25);
  const byDay = tally(rows, (r) => dayFormatter.format(r.createdAt)).sort((a, b) => b.key.localeCompare(a.key));

  return (
    <section className="shell py-8">
      <AdminNav />
      <h1 className="mb-1 text-3xl font-black text-[#0f172a]">გადასვლების ანგარიში</h1>
      <p className="mb-5 text-sm text-[#64748b]">
        პირველი მხარის shop_click მონაცემები ბოლო 30 დღეში{rows ? ` — სულ ${rows.length} გადასვლა` : ""}.
      </p>

      {error ? (
        <div className="rounded-md border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm font-semibold text-[#c2410c]">{error}</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ReportTable title="მაღაზიის მიხედვით" head="მაღაზია" rows={byShop} />
          <ReportTable title="კატეგორიის მიხედვით" head="კატეგორია" rows={byCategory} />
          <ReportTable title="დღის მიხედვით" head="თარიღი" rows={byDay} />
          <ReportTable title="პროდუქტის მიხედვით (ტოპ 25)" head="პროდუქტი" rows={byProduct} />
        </div>
      )}
    </section>
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

function ReportTable({ title, head, rows }: { title: string; head: string; rows: { key: string; count: number }[] }) {
  return (
    <div className="rounded-md border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#e2e8f0] px-4 py-2.5 text-sm font-black text-[#0f172a]">{title}</div>
      {rows.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-black uppercase tracking-wider text-[#64748b]">
              <th className="px-4 py-2">{head}</th>
              <th className="px-4 py-2 text-right">გადასვლები</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-[#f1f5f9]">
                <td className="max-w-0 truncate px-4 py-2 font-semibold text-[#0f172a]">{row.key}</td>
                <td className="px-4 py-2 text-right font-black tabular-nums text-[#0f172a]">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-4 py-4 text-sm text-[#64748b]">მონაცემები ჯერ არ არის.</p>
      )}
    </div>
  );
}
