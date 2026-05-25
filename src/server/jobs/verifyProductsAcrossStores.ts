import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyProductAcrossStores, VerifyProductsOptions } from "@/lib/productVerification";

export async function verifyProductsAcrossStores({
  limit = 20,
  offset = 0,
  cursor,
  productId,
  query,
  category,
  shop,
  onlyNeedsReview = false,
  onlyPublic = false,
  dryRun = false,
  safeMode = true,
}: VerifyProductsOptions & {
  limit?: number;
  offset?: number;
  cursor?: string;
  productId?: string;
  query?: string;
  category?: string;
  onlyNeedsReview?: boolean;
  onlyPublic?: boolean;
}) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const normalizedQuery = query?.trim();
  const where: Prisma.ProductWhereInput = productId
    ? { id: productId }
    : {
        id: cursor ? { gt: cursor } : undefined,
        OR: normalizedQuery
          ? [
              { name: { contains: normalizedQuery, mode: "insensitive" } },
              { normalizedName: { contains: normalizedQuery.toLocaleLowerCase(), mode: "insensitive" } },
              { canonicalKey: { contains: normalizedQuery.toLocaleLowerCase().replace(/\s+/g, "_"), mode: "insensitive" } },
              { offers: { some: { title: { contains: normalizedQuery, mode: "insensitive" } } } },
            ]
          : onlyNeedsReview
            ? [{ needsReview: true }, { categoryNeedsReview: true }, { missingOfferDiscoveryStatus: { in: ["PENDING", "REVIEW", "PARTIAL"] } }]
            : undefined,
        category: category ? { slug: category } : undefined,
        isPublic: onlyPublic ? true : undefined,
        archivedAt: onlyPublic ? null : undefined,
        offers: { some: {} },
      };
  const products = await prisma.product.findMany({
    where,
    orderBy: { id: "asc" },
    skip: cursor || productId ? 0 : offset,
    take: productId ? 1 : limit,
    select: { id: true, name: true },
  });

  const results = [];
  for (const [index, product] of products.entries()) {
    console.log(`[${index + 1}/${products.length}] Verifying ${product.name}`);
    const result = await verifyProductAcrossStores(product.id, { dryRun, safeMode, shop });
    console.log(`Result: ${result.status}; checked=${result.checkedShopsCount}/${result.totalEnabledShopsCount}; exact=${result.exactMatchesFound}; possible=${result.possibleMatchesFound}; rejected=${result.rejectedCandidatesCount}; failed=${result.failed}`);
    results.push(result);
  }

  return {
    products,
    results,
    nextCursor: products.at(-1)?.id ?? cursor,
    nextOffset: offset + products.length,
  };
}
