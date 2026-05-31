import { AdminLogin } from "@/components/admin-login";
import { AdminCodeBlock, AdminEmptyState, AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { listScrapeRuns } from "@/lib/catalog";
import { formatUpdated } from "@/lib/format";

export default async function AdminScrapersPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  const runs = await listScrapeRuns();
  const failed = runs.filter((run) => run.status === "FAILED").length;
  const success = runs.filter((run) => run.status === "SUCCESS").length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="scraper monitor"
        title="სკრეპერის ლოგები"
        description="ბოლო გაშვებების მონიტორინგი, შეცდომები და seen/visited მეტრიკები."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="გაშვებები" value={runs.length} />
        <AdminMetricCard label="წარმატებული" value={success} tone="good" />
        <AdminMetricCard label="ჩავარდნილი" value={failed} tone={failed ? "danger" : "good"} />
      </div>

      <div className="grid gap-3">
        {runs.map((run) => (
          <AdminPanel key={run.id}>
            <article className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{run.shopSlug ?? "scrape"}</p>
                  <h2 className="mt-1 text-xl font-black text-[var(--brand)]">{run.shopName ?? "მაღაზია"}</h2>
                  <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                    {formatUpdated(run.startedAt)} - {run.pagesVisited} გვერდი - {run.offersSeen} შეთავაზება
                  </p>
                </div>
                <AdminStatusPill tone={run.status === "SUCCESS" ? "good" : run.status === "FAILED" ? "danger" : "warn"}>{run.status}</AdminStatusPill>
              </div>
              {run.errorLog ? <div className="mt-3"><AdminCodeBlock>{JSON.stringify(run.errorLog, null, 2)}</AdminCodeBlock></div> : null}
            </article>
          </AdminPanel>
        ))}
        {!runs.length ? <AdminEmptyState title="სკრეპის ლოგები ჯერ არ არის" /> : null}
      </div>
    </AdminShell>
  );
}
