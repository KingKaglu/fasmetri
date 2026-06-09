import Link from "next/link";
import { AdminLogin } from "@/components/admin-login";
import { AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { listProducts, listPublicCategories, listPublicShops } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;

  const [shops, products, categories, recentClicks] = await Promise.all([
    listPublicShops(),
    listProducts({ publicSafe: true, sort: "priority", pageSize: 120 }),
    listPublicCategories(),
    countRecentClicks(),
  ]);
  const visibleShops = shops.filter((shop) => shop.enabled && (shop.productCount ?? 0) > 0);
  const needsReview = products.filter((product) => product.categoryNeedsReview || product.needsReview).length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="site admin"
        title="საიტის მართვა"
        description="აქ დარჩენილია მხოლოდ ის, რაც საჯარო ფასმეტრზე რეალურად ჩანს: პროდუქტები, კატეგორიები, მაღაზიები და მომხმარებლის გადასვლები."
      >
        <Link href="/" className="inline-flex h-11 items-center rounded-2xl bg-white px-4 text-sm font-black text-[#151713] hover:bg-[var(--accent)]">
          საჯარო საიტი
        </Link>
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="პროდუქტები" value={products.length} detail={`${needsReview} საჭიროებს გადახედვას`} tone={needsReview ? "warn" : "good"} />
        <AdminMetricCard label="კატეგორიები" value={categories.length} detail="საჯარო კატალოგი" tone="info" />
        <AdminMetricCard label="მაღაზიები" value={visibleShops.length} detail="საიტზე ჩანს" tone="good" />
        <AdminMetricCard label="კლიკები" value={recentClicks} detail="ბოლო 30 დღე" tone="info" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <AdminPanel title="ძირითადი ფანჯრები" description="მოკლე, სუფთა admin მენიუ მხოლოდ რეალური საიტის ნაწილებისთვის.">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {[
              ["/admin/products", "პროდუქტები", "საჯარო პროდუქტის სახელი, კატეგორია და metadata"],
              ["/admin/categories/review", "კატეგორიები", "პროდუქტის კატეგორიის გადამოწმება source link-ებით"],
              ["/admin/shops", "მაღაზიები", "ჩართული მაღაზიები და საჯარო shop metadata"],
              ["/admin/clicks", "კლიკები", "რომელ საიტზე და პროდუქტზე გადავიდა მომხმარებელი"],
            ].map(([href, title, desc]) => (
              <Link key={href} href={href} className="rounded-2xl border border-[#dbe5d3] bg-[#f8fbf4] p-4 hover:border-[#151713] hover:bg-white">
                <p className="font-black text-[var(--brand)]">{title}</p>
                <p className="mt-1 text-sm font-bold text-[var(--muted)]">{desc}</p>
              </Link>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="საიტის კატეგორიები" description="ეს არის ის კატეგორიები, რომლებსაც public catalog იყენებს.">
          <div className="grid gap-2 p-3">
            {categories.slice(0, 10).map((category) => (
              <Link key={category.id} href={`/categories/${category.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-[#dbe5d3] bg-[#f8fbf4] p-3 hover:border-[#151713] hover:bg-white">
                <span className="min-w-0 truncate text-sm font-black text-[var(--brand)]">{category.nameKa}</span>
                <AdminStatusPill tone="info">{category.slug}</AdminStatusPill>
              </Link>
            ))}
            {categories.length > 10 ? <p className="px-2 text-xs font-bold text-[var(--muted)]">კიდევ {categories.length - 10} კატეგორია ჩანს კატალოგში.</p> : null}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

async function countRecentClicks() {
  if (!prisma) return 0;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return prisma.clickEvent.count({ where: { createdAt: { gte: since } } }).catch(() => 0);
}
