import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { isAdminRequest } from "@/lib/admin-auth";
import { getCatalogCoverageSummary } from "@/lib/catalogCoverage";

export default async function AdminCatalogCoveragePage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
  const summary = await getCatalogCoverageSummary();

  return (
    <section className="shell py-8">
      <AdminNav />
      <div className="mb-6">
        <p className="text-sm font-black text-[#067b6a]">Catalog coverage</p>
        <h1 className="text-3xl font-black">კატალოგის დაფარვა</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#53666f]">
          აქ ჩანს RawOffer იმპორტი, დადასტურებული offer-ები, public პროდუქცია და review queue. ეს გვერდი ადმინისტრაციისთვისაა და
          public გვერდებზე არ გამოჩნდება ტექნიკური მდგომარეობა.
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Metric label="RawOffer" value={summary.totals.rawOffers} />
        <Metric label="CanonicalProduct" value={summary.totals.canonicalProducts} />
        <Metric label="Public products" value={summary.totals.publicProducts} />
        <Metric label="Needs review" value={summary.totals.needsReview + summary.totals.missingCategory} />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="grid min-w-[980px] grid-cols-[1.2fr_.7fr_.8fr_.8fr_.8fr_.8fr_.8fr_.8fr_.8fr_1.1fr] gap-2 border-b bg-[#f7faf9] px-4 py-3 text-xs font-black uppercase text-[#53666f]">
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
        <div className="overflow-x-auto">
          {summary.stores.map((store) => (
            <article key={store.shopId} className="grid min-w-[980px] grid-cols-[1.2fr_.7fr_.8fr_.8fr_.8fr_.8fr_.8fr_.8fr_.8fr_1.1fr] gap-2 border-b px-4 py-3 text-sm last:border-b-0">
              <div>
                <p className="font-black">{store.name}</p>
                <p className="text-xs text-[#53666f]">{store.enabled ? "enabled" : "disabled"} · {store.ingestionStatus}</p>
              </div>
              <span>{store.rawOffers}</span>
              <span>{store.confirmedOffers}</span>
              <span>{store.publicProducts}</span>
              <span>{store.missingCategory}</span>
              <span>{store.missingImage}</span>
              <span>{store.missingPrice}</span>
              <span>{store.needsReview}</span>
              <span>{store.failedRuns}</span>
              <div className="grid gap-1 text-xs font-black">
                <code>npm run ingest:{store.slug}:full -- --limit=200 --resume</code>
                <code>npm run recategorize-products -- --shop={store.slug} --limit=200</code>
                <code>npm run verify-products -- --shop={store.slug} --limit=20</code>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-[#53666f]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </article>
  );
}
