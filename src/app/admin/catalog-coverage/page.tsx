import { AdminLogin } from "@/components/admin-login";
import { AdminEmptyState, AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { getCatalogCoverageSummary } from "@/lib/catalogCoverage";

export default async function AdminCatalogCoveragePage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  const summary = await getCatalogCoverageSummary();

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="catalog coverage"
        title="კატალოგის დაფარვა"
        description="RawOffer, დადასტურებული offer-ები, public პროდუქტები და review queue მაღაზიების მიხედვით."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminMetricCard label="RawOffer" value={summary.totals.rawOffers} />
        <AdminMetricCard label="CanonicalProduct" value={summary.totals.canonicalProducts} tone="info" />
        <AdminMetricCard label="Public products" value={summary.totals.publicProducts} tone="good" />
        <AdminMetricCard label="Needs review" value={summary.totals.needsReview + summary.totals.missingCategory} tone={summary.totals.needsReview ? "warn" : "good"} />
      </div>

      <AdminPanel title="მაღაზიების დაფარვა" description="ჰორიზონტალურად გადაადგილდება პატარა ეკრანებზე, რომ მონაცემები არ დაიჭრას.">
        {summary.stores.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[1.2fr_.7fr_.75fr_.75fr_.8fr_.75fr_.75fr_.75fr_.65fr_1.25fr] gap-2 border-b border-[#dbe5d3] bg-[#f8fbf4] px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
                <span>მაღაზია</span>
                <span>Raw</span>
                <span>Offers</span>
                <span>Public</span>
                <span>Missing cat</span>
                <span>No image</span>
                <span>No price</span>
                <span>Review</span>
                <span>Fails</span>
                <span>Actions</span>
              </div>
              {summary.stores.map((store) => (
                <article key={store.shopId} className="grid grid-cols-[1.2fr_.7fr_.75fr_.75fr_.8fr_.75fr_.75fr_.75fr_.65fr_1.25fr] gap-2 border-b border-[#edf2e8] px-4 py-3 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-black text-[var(--brand)]">{store.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <AdminStatusPill tone={store.enabled ? "good" : "neutral"}>{store.enabled ? "enabled" : "disabled"}</AdminStatusPill>
                      <AdminStatusPill tone={store.ingestionStatus === "ready" ? "good" : "warn"}>{store.ingestionStatus}</AdminStatusPill>
                    </div>
                  </div>
                  <MetricNumber value={store.rawOffers} />
                  <MetricNumber value={store.confirmedOffers} />
                  <MetricNumber value={store.publicProducts} />
                  <MetricNumber value={store.missingCategory} warn />
                  <MetricNumber value={store.missingImage} warn />
                  <MetricNumber value={store.missingPrice} warn />
                  <MetricNumber value={store.needsReview} warn />
                  <MetricNumber value={store.failedRuns} danger />
                  <div className="grid gap-1 text-xs font-black">
                    <code className="rounded-lg bg-[#edf4e7] px-2 py-1">npm run ingest:{store.slug}:full -- --limit=200 --resume</code>
                    <code className="rounded-lg bg-[#edf4e7] px-2 py-1">npm run recategorize-products -- --shop={store.slug} --limit=200</code>
                    <code className="rounded-lg bg-[#edf4e7] px-2 py-1">npm run verify-products -- --shop={store.slug} --limit=20</code>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <AdminEmptyState title="Coverage მონაცემები ვერ მოიძებნა" />
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}

function MetricNumber({ value, warn = false, danger = false }: { value: number; warn?: boolean; danger?: boolean }) {
  const tone = danger && value > 0 ? "text-[var(--danger)]" : warn && value > 0 ? "text-[var(--warn)]" : "text-[var(--brand)]";
  return <span className={`font-black tabular-nums ${tone}`}>{value}</span>;
}
