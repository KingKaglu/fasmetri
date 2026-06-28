import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { ProductEditor } from "@/components/admin-metadata-editors";
import { AdminCodeBlock, AdminEmptyState, AdminKeyValue, AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { ProductImage } from "@/components/public-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { listCategories, listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminCategoryReviewPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  const [products, categories] = await Promise.all([
    listProducts({ needsCategoryReview: true, sort: "updated", pageSize: 80 }),
    listCategories(),
  ]);

  return (
    <AdminShell>
      <AdminPageHeader
        breadcrumbs={[{ label: "ადმინი", href: "/admin" }, { label: "კატეგორიები" }]}
        title="კატეგორიის review"
        description="დაბალი confidence მქონე პროდუქტები გადაამოწმე source link-ებით და შემდეგ ჩაკეტე სწორი კატეგორია."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="Review queue" value={products.length} tone={products.length ? "warn" : "good"} />
        <AdminMetricCard label="კატეგორიები" value={categories.length} />
        <AdminMetricCard label="შემოწმების ლინკები" value="Public + Offers" tone="info" />
      </div>

      <div className="grid gap-3">
        {products.map((product) => (
          <AdminPanel key={product.id}>
            <article className="grid gap-4 p-4 lg:grid-cols-[8rem_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-2xl border border-[#ededee] bg-[#fafafa]">
                <ProductImage src={product.imageUrl} alt={product.name} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-black text-[var(--brand)]">{product.name}</h2>
                    <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                      მიმდინარე: {product.category?.nameKa ?? "კატეგორიის გარეშე"} - შემოთავაზება: {product.categorySuggestedSlug ?? "არ არის"}
                    </p>
                  </div>
                  <AdminStatusPill tone={(product.categoryConfidence ?? 0) >= 70 ? "warn" : "danger"}>
                    Confidence {product.categoryConfidence ?? 0}%
                  </AdminStatusPill>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <AdminKeyValue label="რატომ მოხვდა review-ში" value={product.categoryReason ?? "მიზეზი არ არის შენახული"} />
                  <AdminKeyValue label="შეთავაზებების რაოდენობა" value={product.offers.length} />
                </div>

                <div className="mt-3 rounded-[1rem] border border-[#ededee] bg-[#fafafa] p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">შემოწმების ლინკები</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/products/${product.slug}`} target="_blank" className="inline-flex h-10 items-center gap-1 rounded-2xl bg-[#0a0a0a] px-3 text-xs font-black text-white hover:bg-black">
                      Public product <ExternalLink className="size-3.5 text-[var(--accent)]" />
                    </Link>
                    {product.offers.map((offer) => (
                      <a
                        key={offer.id}
                        href={offer.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 max-w-full items-center gap-1 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#0a0a0a]"
                      >
                        <span className="truncate">{offer.shop.name}</span>
                        <ExternalLink className="size-3.5 shrink-0" />
                      </a>
                    ))}
                    {!product.offers.length ? <span className="text-sm font-bold text-[var(--muted)]">offer link ჯერ არ არის.</span> : null}
                  </div>
                </div>

                {product.categoryMatchedRules ? <div className="mt-3"><AdminCodeBlock>{JSON.stringify(product.categoryMatchedRules, null, 2)}</AdminCodeBlock></div> : null}
                {product.categorySourceSignals ? <div className="mt-3"><AdminCodeBlock>{JSON.stringify(product.categorySourceSignals, null, 2)}</AdminCodeBlock></div> : null}
                <ProductEditor product={product} categories={categories} />
              </div>
            </article>
          </AdminPanel>
        ))}
        {!products.length ? <AdminEmptyState title="Category review queue ცარიელია" description="ამ ეტაპზე დაბალი confidence პროდუქტები არ ჩანს." /> : null}
      </div>
    </AdminShell>
  );
}
