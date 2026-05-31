import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { MergeForm } from "@/components/merge-form";
import { CategoryEditor, ProductEditor } from "@/components/admin-metadata-editors";
import { AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { listProducts, listPublicCategories } from "@/lib/catalog";
import { formatUpdated } from "@/lib/format";

export default async function AdminProductsPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  const [products, categories] = await Promise.all([
    listProducts({ publicSafe: true, sort: "newest", pageSize: 120 }),
    listPublicCategories(),
  ]);
  const locked = products.filter((product) => product.categoryLocked).length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="catalog maintenance"
        title="პროდუქტები"
        description="საიტზე გამოჩენილი public პროდუქტების metadata, კატეგორია და ძირითადი ბმულები."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="საიტზე ჩანს" value={products.length} tone="good" />
        <AdminMetricCard label="კატეგორიები" value={categories.length} tone="info" />
        <AdminMetricCard label="ჩაკეტილი" value={locked} tone="info" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-3">
          {products.map((product) => (
            <AdminPanel key={product.id}>
              <article className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-black text-[var(--brand)]">{product.name}</h2>
                    <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                      {product.category?.nameKa ?? "კატეგორიის გარეშე"} - {product.offers.length} შეთავაზება - განახლდა {formatUpdated(product.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <AdminStatusPill tone={product.isPublic ? "good" : "neutral"}>{product.isPublic ? "Public" : "Hidden"}</AdminStatusPill>
                    {product.categoryNeedsReview ? <AdminStatusPill tone="warn">Category review</AdminStatusPill> : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/products/${product.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#c8d7bd] bg-[#f8fbf4] px-3 text-xs font-black text-[var(--brand)] hover:border-[#151713]">
                    Public page <ExternalLink className="size-3.5" />
                  </Link>
                  {product.offers.slice(0, 4).map((offer) => (
                    <a key={offer.id} href={offer.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#c8d7bd] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#151713]">
                      {offer.shop.name} <ExternalLink className="size-3.5" />
                    </a>
                  ))}
                </div>
                <ProductEditor product={product} categories={categories} />
              </article>
            </AdminPanel>
          ))}
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <MergeForm products={products} />
          <CategoryEditor categories={categories} />
        </aside>
      </div>
    </AdminShell>
  );
}
