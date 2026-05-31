import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminEmptyState, AdminKeyValue, AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminVariantReviewPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  const variants = prisma
    ? await prisma.productVariant.findMany({
        where: { OR: [{ needsReview: true }, { offers: { none: {} } }] },
        include: {
          parentProduct: { include: { category: true } },
          offers: { include: { shop: true }, orderBy: { currentPrice: "asc" }, take: 6 },
          rawOffers: { include: { shop: true }, take: 4, orderBy: { updatedAt: "desc" } },
        },
        orderBy: [{ needsReview: "desc" }, { updatedAt: "desc" }],
        take: 120,
      })
    : [];

  const noOffers = variants.filter((variant) => !variant.offers.length).length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="variant review"
        title="Product variants needing review"
        description="ზუსტი price comparison ProductVariant დონეზე ხდება. აქ ჩანს RAM/storage/color/SKU ვარიანტები, რომლებიც დადასტურებას ელოდება."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="ვარიანტები" value={variants.length} tone={variants.length ? "warn" : "good"} />
        <AdminMetricCard label="offer-ის გარეშე" value={noOffers} tone={noOffers ? "danger" : "good"} />
        <AdminMetricCard label="review mode" value="Variant" tone="info" />
      </div>

      <div className="grid gap-3">
        {variants.map((variant) => (
          <AdminPanel key={variant.id}>
            <article className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{variant.parentProduct.category?.nameKa ?? "Uncategorized"}</p>
                  <h2 className="mt-1 break-words text-xl font-black text-[var(--brand)]">{variant.variantTitle}</h2>
                </div>
                <AdminStatusPill tone={variant.offers.length ? "warn" : "danger"}>
                  {variant.offers.length} confirmed - {variant.rawOffers.length} raw
                </AdminStatusPill>
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                <AdminKeyValue label="Variant key" value={variant.canonicalVariantKey} />
                <AdminKeyValue label="Parent key" value={variant.parentProduct.canonicalParentKey ?? "არ არის"} />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <OfferBox title="Confirmed offers">
                  {variant.offers.map((offer) => (
                    <div key={offer.id} className="rounded-xl border border-[#dbe5d3] bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-black text-[var(--brand)]">{offer.shop.name} - {offer.currentPrice.toString()} GEL</p>
                        <a href={offer.url} target="_blank" rel="noreferrer" className="text-[var(--muted)] hover:text-[var(--brand)]">
                          <ExternalLink className="size-4" />
                        </a>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{offer.title}</p>
                    </div>
                  ))}
                  {!variant.offers.length ? <p className="text-sm font-bold text-[var(--muted)]">No confirmed offers attached yet.</p> : null}
                </OfferBox>

                <OfferBox title="Latest raw offers">
                  {variant.rawOffers.map((raw) => (
                    <div key={raw.id} className="rounded-xl border border-[#dbe5d3] bg-white p-3 text-sm">
                      <p className="font-black text-[var(--brand)]">{raw.shop.name} - {raw.rawPrice?.toString() ?? "no price"} GEL</p>
                      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{raw.originalTitle}</p>
                    </div>
                  ))}
                  {!variant.rawOffers.length ? <p className="text-sm font-bold text-[var(--muted)]">No raw offers linked to this variant.</p> : null}
                </OfferBox>
              </div>
            </article>
          </AdminPanel>
        ))}
        {!variants.length ? <AdminEmptyState title="Variant review queue ცარიელია" /> : null}
      </div>
    </AdminShell>
  );
}

function OfferBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1rem] border border-[#dbe5d3] bg-[#f8fbf4] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{title}</p>
      <div className="mt-2 grid gap-2">{children}</div>
    </div>
  );
}
