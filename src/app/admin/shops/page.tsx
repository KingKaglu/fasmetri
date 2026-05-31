import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminShopActions } from "@/components/admin-shop-actions";
import { ShopEditor } from "@/components/admin-metadata-editors";
import { AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { listPublicShops } from "@/lib/catalog";

export default async function AdminShopsPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  const shops = (await listPublicShops()).filter((shop) => shop.enabled && (shop.productCount ?? 0) > 0);
  const needsConfig = shops.filter((shop) => shop.needsConfiguration).length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="store operations"
        title="მაღაზიების მართვა"
        description="აქ ჩანს მხოლოდ ის მაღაზიები, რომლებიც საჯარო საიტზე რეალურად მონაწილეობენ."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="საიტზე ჩანს" value={shops.length} tone="good" />
        <AdminMetricCard label="პროდუქტები" value={shops.reduce((sum, shop) => sum + (shop.productCount ?? 0), 0)} />
        <AdminMetricCard label="კონფიგურაცია სჭირდება" value={needsConfig} tone={needsConfig ? "warn" : "good"} />
      </div>

      <div className="grid gap-3">
        {shops.map((shop) => (
          <AdminPanel key={shop.id}>
            <article className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{shop.slug}</p>
                    <h2 className="mt-1 truncate text-2xl font-black text-[var(--brand)]">{shop.name}</h2>
                    <a href={shop.baseUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 text-sm font-bold text-[var(--muted)] hover:text-[var(--brand)]">
                      <span className="truncate">{shop.needsConfiguration ? "needs selector/API configuration" : shop.baseUrl}</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  </div>
                  <AdminStatusPill tone={shop.enabled ? "good" : "neutral"}>{shop.enabled ? "ჩართულია" : "გამორთულია"}</AdminStatusPill>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <AdminMetricCard label="პროდუქტები" value={shop.productCount ?? 0} />
                  <AdminMetricCard label="აქციები" value={shop.dealCount ?? 0} tone="warn" />
                  <AdminMetricCard label="სტატუსი" value={shop.needsConfiguration ? "Config" : "Ready"} tone={shop.needsConfiguration ? "warn" : "good"} />
                </div>
              </div>
              <div className="grid content-start gap-3">
                <AdminShopActions id={shop.id} enabled={shop.enabled} needsConfiguration={shop.needsConfiguration} />
                <ShopEditor shop={shop} />
              </div>
            </article>
          </AdminPanel>
        ))}
      </div>
    </AdminShell>
  );
}
