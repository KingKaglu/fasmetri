import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { isAdminRequest } from "@/lib/admin-auth";
import { listProducts, listScrapeRuns, listShops } from "@/lib/catalog";

export default async function AdminPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
  const [shops, products, runs] = await Promise.all([listShops(), listProducts(), listScrapeRuns()]);
  return <section className="shell py-8"><AdminNav /><h1 className="mb-5 text-3xl font-black">ადმინ დაფა</h1><div className="grid gap-3 sm:grid-cols-3">{[["მაღაზიები", shops.length], ["პროდუქტები", products.length], ["სკრეპის გაშვებები", runs.length]].map(([label, count]) => <article key={String(label)} className="rounded-lg border bg-white p-5"><p className="text-sm font-bold text-[#53656e]">{label}</p><p className="text-4xl font-black">{count}</p></article>)}</div></section>;
}
