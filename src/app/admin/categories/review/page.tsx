import { AdminLogin } from "@/components/admin-login";
import { ProductEditor } from "@/components/admin-metadata-editors";
import { AdminNav } from "@/components/admin-nav";
import { ProductImage } from "@/components/public-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { listCategories, listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminCategoryReviewPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
  const [products, categories] = await Promise.all([
    listProducts({ needsCategoryReview: true, sort: "updated", pageSize: 80 }),
    listCategories(),
  ]);

  return (
    <section className="shell py-8">
      <AdminNav />
      <div className="mb-5">
        <h1 className="text-3xl font-black">კატეგორიის review</h1>
        <p className="mt-2 text-[#53656e]">დაბალი confidence მქონე პროდუქტები გადაამოწმე და საჭირო კატეგორია ჩაკეტე.</p>
      </div>
      <div className="grid gap-3">
        {products.map((product) => (
          <article key={product.id} className="grid gap-4 rounded-lg border bg-white p-4 lg:grid-cols-[7rem_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-md border"><ProductImage src={product.imageUrl} alt={product.name} /></div>
            <div className="min-w-0">
              <h2 className="break-words text-lg font-black">{product.name}</h2>
              <p className="mt-1 text-sm text-[#53656e]">მიმდინარე: {product.category?.nameKa ?? "კატეგორიის გარეშე"} · შემოთავაზება: {product.categorySuggestedSlug ?? "არ არის"} · Confidence: {product.categoryConfidence ?? 0}%</p>
              {product.categoryReason ? <p className="mt-1 text-sm text-[#53656e]">{product.categoryReason}</p> : null}
              {product.categoryMatchedRules ? <pre className="mt-2 max-h-24 overflow-auto rounded-md bg-[#f7faf9] p-2 text-xs">{JSON.stringify(product.categoryMatchedRules, null, 2)}</pre> : null}
              {product.categorySourceSignals ? <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-[#f7faf9] p-2 text-xs">{JSON.stringify(product.categorySourceSignals, null, 2)}</pre> : null}
              <ProductEditor product={product} categories={categories} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
