import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { MatchCandidateActions } from "@/components/match-candidate-actions";
import { isAdminRequest } from "@/lib/admin-auth";
import { extractProductIdentity, ProductIdentity } from "@/lib/productIdentity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMatchingReviewPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
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
    <section className="shell py-8">
      <AdminNav />
      <h1 className="text-3xl font-black">Matching review</h1>
      <p className="mt-2 text-[#53666f]">აქ ჩანს მხოლოდ შესაძლო იგივე პროდუქტი. დადასტურებამდე public comparison-ში არ ერთვება.</p>
      <div className="mt-5 grid gap-3">
        {candidates.map((candidate) => {
          const productIdentity = extractProductIdentity({ title: candidate.product.name, categorySlug: candidate.product.category?.slug });
          const offerIdentity = extractProductIdentity({ title: candidate.offer.title, categorySlug: candidate.product.category?.slug });
          return (
          <article key={candidate.id} className="grid gap-4 rounded-lg border bg-white p-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-black text-[#067b6a]">პროდუქტი A</p>
              <h2 className="mt-1 font-black">{candidate.product.name}</h2>
              <p className="mt-1 text-sm text-[#53666f]">Confidence: {candidate.confidence}% · არსებული offers: {candidate.product.offers.map((offer) => offer.shop.name).join(", ") || "არ არის"}</p>
              <IdentityPreview identity={productIdentity} />
            </div>
            <div>
              <p className="text-xs font-black text-[#067b6a]">კანდიდატი offer</p>
              <h3 className="mt-1 font-black">{candidate.offer.title}</h3>
              <p className="mt-1 text-sm text-[#53666f]">{candidate.offer.shop.name} · {candidate.offer.currentPrice.toString()} GEL</p>
              <IdentityPreview identity={offerIdentity} />
              {candidate.reasons ? <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-[#f7faf9] p-2 text-xs">{JSON.stringify(candidate.reasons, null, 2)}</pre> : null}
              <MatchCandidateActions id={candidate.id} />
            </div>
          </article>
        )})}
      </div>
    </section>
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
    <div className="mt-3 rounded-md bg-[#f7faf9] p-3 text-xs font-bold text-[#53666f]">
      <p className="break-all text-[#07584e]">Key: {identity.canonicalKey ?? "არასაკმარისი ატრიბუტები"}</p>
      <p className="mt-2">{values.join(" · ") || "სტრუქტურული ატრიბუტები ვერ ამოიკითხა"}</p>
    </div>
  );
}
