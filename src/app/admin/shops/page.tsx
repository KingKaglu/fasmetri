import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { AdminShopActions } from "@/components/admin-shop-actions";
import { ShopEditor } from "@/components/admin-metadata-editors";
import { isAdminRequest } from "@/lib/admin-auth";
import { listShops } from "@/lib/catalog";

export default async function AdminShopsPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
  const shops = await listShops();
  return <section className="shell py-8"><AdminNav /><h1 className="mb-5 text-3xl font-black">მაღაზიების მართვა</h1><div className="grid gap-3">{shops.map((shop) => <article key={shop.id} className="rounded-lg border bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">{shop.name}</h2><p className="text-sm text-[#53656e]">{shop.needsConfiguration ? "needs selector/API configuration" : shop.baseUrl}</p></div><span className="rounded-md bg-[#edf4f1] px-2 py-1 text-xs font-bold">{shop.enabled ? "ჩართულია" : "გამორთულია"}</span></div><div className="grid gap-3"><AdminShopActions id={shop.id} enabled={shop.enabled} needsConfiguration={shop.needsConfiguration} /><ShopEditor shop={shop} /></div></article>)}</div></section>;
}
