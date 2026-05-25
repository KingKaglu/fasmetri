import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminVariantReviewPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
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

  return (
    <section className="shell py-8">
      <AdminNav />
      <div className="mb-6">
        <p className="text-sm font-black text-[#067b6a]">Variant review</p>
        <h1 className="text-3xl font-black">Product variants needing review</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#53666f]">
          Exact price comparison happens on ProductVariant rows. This queue keeps color/RAM/storage/SKU variants visible for admin review before they become trusted public comparisons.
        </p>
      </div>

      <div className="grid gap-3">
        {variants.map((variant) => (
          <article key={variant.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#067b6a]">{variant.parentProduct.category?.nameKa ?? "Uncategorized"}</p>
                <h2 className="mt-1 text-lg font-black">{variant.variantTitle}</h2>
                <p className="mt-1 break-all text-xs text-[#53666f]">Variant key: {variant.canonicalVariantKey}</p>
                <p className="mt-1 break-all text-xs text-[#53666f]">Parent key: {variant.parentProduct.canonicalParentKey}</p>
              </div>
              <div className="rounded-lg bg-[#f7faf9] px-3 py-2 text-xs font-black text-[#07584e]">
                {variant.offers.length} confirmed offers · {variant.rawOffers.length} raw candidates
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg bg-[#f8fafc] p-3">
                <p className="text-xs font-black uppercase text-[#53666f]">Confirmed offers</p>
                <div className="mt-2 grid gap-2">
                  {variant.offers.map((offer) => (
                    <div key={offer.id} className="rounded-md border bg-white p-2 text-sm">
                      <p className="font-black">{offer.shop.name} · {offer.currentPrice.toString()} ₾</p>
                      <p className="mt-1 text-xs text-[#53666f]">{offer.title}</p>
                    </div>
                  ))}
                  {!variant.offers.length ? <p className="text-sm text-[#53666f]">No confirmed offers attached yet.</p> : null}
                </div>
              </div>
              <div className="rounded-lg bg-[#f8fafc] p-3">
                <p className="text-xs font-black uppercase text-[#53666f]">Latest raw offers</p>
                <div className="mt-2 grid gap-2">
                  {variant.rawOffers.map((raw) => (
                    <div key={raw.id} className="rounded-md border bg-white p-2 text-sm">
                      <p className="font-black">{raw.shop.name} · {raw.rawPrice?.toString() ?? "no price"} ₾</p>
                      <p className="mt-1 text-xs text-[#53666f]">{raw.originalTitle}</p>
                    </div>
                  ))}
                  {!variant.rawOffers.length ? <p className="text-sm text-[#53666f]">No raw offers linked to this variant.</p> : null}
                </div>
              </div>
            </div>
          </article>
        ))}
        {!variants.length ? <div className="rounded-xl border bg-white p-6 text-sm text-[#53666f]">No variants need review right now.</div> : null}
      </div>
    </section>
  );
}
