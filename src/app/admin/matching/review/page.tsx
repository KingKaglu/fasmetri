import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminCodeBlock, AdminEmptyState, AdminKeyValue, AdminLoginShell, AdminMetricCard, AdminPageHeader, AdminPanel, AdminShell, AdminStatusPill } from "@/components/admin-ui";
import { MatchCandidateActions } from "@/components/match-candidate-actions";
import { isAdminRequest } from "@/lib/admin-auth";
import { extractProductIdentity, ProductIdentity } from "@/lib/productIdentity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMatchingReviewPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  const candidates = prisma ? await prisma.offerMatchCandidate.findMany({
    where: { status: "POSSIBLE" },
    include: {
      product: { include: { category: true, offers: { include: { shop: true }, take: 2, orderBy: { currentPrice: "asc" } } } },
      offer: { include: { shop: true, product: true } },
    },
    orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
    take: 80,
  }) : [];

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="matching review"
        title="Matching review"
        description="შესაძლო იგივე პროდუქტის კანდიდატები. დადასტურებამდე public comparison-ში არ ერთვება."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="კანდიდატები" value={candidates.length} tone={candidates.length ? "warn" : "good"} />
        <AdminMetricCard label="პროცესი" value="Manual" tone="info" />
        <AdminMetricCard label="უსაფრთხოება" value="Hidden" detail="დადასტურებამდე საჯაროდ არ ჩანს" tone="good" />
      </div>

      <div className="grid gap-3">
        {candidates.map((candidate) => {
          const productIdentity = extractProductIdentity({ title: candidate.product.name, categorySlug: candidate.product.category?.slug });
          const offerIdentity = extractProductIdentity({ title: candidate.offer.title, categorySlug: candidate.product.category?.slug });
          return (
            <AdminPanel key={candidate.id}>
              <article className="grid gap-4 p-4 lg:grid-cols-2">
                <div className="rounded-[1rem] border border-[#dbe5d3] bg-[#f8fbf4] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">პროდუქტი A</p>
                      <h2 className="mt-1 text-lg font-black text-[var(--brand)]">{candidate.product.name}</h2>
                      <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                        Offers: {candidate.product.offers.map((offer) => offer.shop.name).join(", ") || "არ არის"}
                      </p>
                    </div>
                    <AdminStatusPill tone={(candidate.confidence ?? 0) >= 80 ? "warn" : "danger"}>{candidate.confidence}%</AdminStatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidate.product.offers.map((offer) => (
                      <a key={offer.id} href={offer.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#c8d7bd] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#151713]">
                        {offer.shop.name} <ExternalLink className="size-3.5" />
                      </a>
                    ))}
                  </div>
                  <IdentityPreview identity={productIdentity} />
                </div>

                <div className="rounded-[1rem] border border-[#dbe5d3] bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">კანდიდატი offer</p>
                  <h3 className="mt-1 text-lg font-black text-[var(--brand)]">{candidate.offer.title}</h3>
                  <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                    {candidate.offer.shop.name} - {candidate.offer.currentPrice.toString()} GEL
                  </p>
                  <a href={candidate.offer.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-1 rounded-2xl bg-[#151713] px-3 text-xs font-black text-white hover:bg-black">
                    Source link <ExternalLink className="size-3.5 text-[var(--accent)]" />
                  </a>
                  <IdentityPreview identity={offerIdentity} />
                  {candidate.reasons ? <div className="mt-3"><AdminCodeBlock>{JSON.stringify(candidate.reasons, null, 2)}</AdminCodeBlock></div> : null}
                  <MatchCandidateActions id={candidate.id} />
                </div>
              </article>
            </AdminPanel>
          );
        })}
        {!candidates.length ? <AdminEmptyState title="Matching review queue ცარიელია" /> : null}
      </div>
    </AdminShell>
  );
}

function IdentityPreview({ identity }: { identity: ProductIdentity }) {
  const values = [
    identity.model ? `Model: ${identity.model}` : null,
    identity.sku ? `SKU: ${identity.sku}` : null,
    identity.cpu ? `CPU: ${identity.cpu}` : null,
    identity.ram ? `RAM: ${identity.ram}` : null,
    identity.storage ? `Storage: ${identity.storage}` : null,
    identity.color ? `Color: ${identity.color}` : null,
    identity.simType ? `SIM: ${identity.simType}` : null,
  ].filter((value): value is string => Boolean(value));
  return (
    <div className="mt-3 grid gap-2">
      <AdminKeyValue label="Canonical key" value={identity.canonicalKey ?? "არასაკმარისი ატრიბუტები"} />
      <AdminKeyValue label="Attributes" value={values.join(" - ") || "სტრუქტურული ატრიბუტები ვერ ამოიკითხა"} />
    </div>
  );
}
