import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { MergeForm } from "@/components/merge-form";
import { CategoryEditor, ProductEditor } from "@/components/admin-metadata-editors";
import { isAdminRequest } from "@/lib/admin-auth";
import { listCategories, listProducts } from "@/lib/catalog";

export default async function AdminProductsPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
  const [products, categories] = await Promise.all([listProducts({ sort: "newest" }), listCategories()]);
  return <section className="shell py-8"><AdminNav /><div className="grid gap-5 lg:grid-cols-[1fr_22rem]"><div><h1 className="mb-5 text-3xl font-black">პროდუქტები</h1><div className="grid gap-2">{products.map((product) => <article key={product.id} className="rounded-lg border bg-white p-4"><h2 className="font-black">{product.name}</h2><p className="text-sm text-[#53656e]">{product.category?.nameKa} · {product.offers.length} შეთავაზება</p><ProductEditor product={product} categories={categories} /></article>)}</div></div><div className="grid h-fit gap-4"><MergeForm products={products} /><CategoryEditor categories={categories} /></div></div></section>;
}
