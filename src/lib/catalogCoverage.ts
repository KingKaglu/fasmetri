import { PUBLIC_OFFER_MATCH_STATUSES } from "@/lib/catalog-types";
import { prisma } from "@/lib/prisma";

export type StoreCoverageRow = {
  shopId: string;
  slug: string;
  name: string;
  enabled: boolean;
  needsConfiguration: boolean;
  ingestionStatus: string;
  lastIngestedAt: string | null;
  rawOffers: number;
  confirmedOffers: number;
  parentProducts: number;
  publicProducts: number;
  variants: number;
  missingCategory: number;
  missingImage: number;
  missingPrice: number;
  needsReview: number;
  excludedFromPublic: number;
  failedRuns: number;
};

export type CatalogCoverageSummary = {
  stores: StoreCoverageRow[];
  totals: {
    rawOffers: number;
    canonicalProducts: number;
    parentProducts: number;
    publicProducts: number;
    variants: number;
    missingCategory: number;
    missingImage: number;
    missingPrice: number;
    needsReview: number;
    excludedFromPublic: number;
  };
};

export async function getCatalogCoverageSummary(): Promise<CatalogCoverageSummary> {
  if (!prisma) {
    return {
      stores: [],
      totals: {
        rawOffers: 0,
        canonicalProducts: 0,
        parentProducts: 0,
        publicProducts: 0,
        variants: 0,
        missingCategory: 0,
        missingImage: 0,
        missingPrice: 0,
        needsReview: 0,
        excludedFromPublic: 0,
      },
    };
  }

  const shops = await prisma.shop.findMany({ orderBy: { name: "asc" } });
  const rows: StoreCoverageRow[] = [];

  for (const shop of shops) {
    const [
      rawOffers,
      confirmedOffers,
      productOffers,
      parentProducts,
      variants,
      missingCategory,
      missingImage,
      missingPrice,
      needsReview,
      excludedFromPublic,
      failedRuns,
    ] = await Promise.all([
      prisma.rawOffer.count({ where: { shopId: shop.id } }),
      prisma.productOffer.count({ where: { shopId: shop.id, matchStatus: { in: [...PUBLIC_OFFER_MATCH_STATUSES] } } }),
      prisma.productOffer.findMany({
        where: {
          shopId: shop.id,
          matchStatus: { in: [...PUBLIC_OFFER_MATCH_STATUSES] },
          product: { isPublic: true, archivedAt: null, needsReview: false, categoryNeedsReview: false },
        },
        select: { productId: true },
      }),
      prisma.parentProduct.count({
        where: { offers: { some: { shopId: shop.id } } },
      }),
      prisma.productVariant.count({
        where: { offers: { some: { shopId: shop.id } } },
      }),
      prisma.rawOffer.count({ where: { shopId: shop.id, OR: [{ categorySlug: null }, { categoryNeedsReview: true }] } }),
      prisma.rawOffer.count({ where: { shopId: shop.id, originalImageUrl: null } }),
      prisma.rawOffer.count({ where: { shopId: shop.id, OR: [{ rawPrice: null }, { rawPrice: { lte: 0 } }] } }),
      prisma.rawOffer.count({ where: { shopId: shop.id, status: { in: ["NEEDS_REVIEW", "UNABLE_TO_FETCH"] } } }),
      prisma.productOffer.count({
        where: {
          shopId: shop.id,
          product: { OR: [{ isPublic: false }, { archivedAt: { not: null } }, { needsReview: true }, { categoryNeedsReview: true }] },
        },
      }),
      prisma.scrapeRun.count({ where: { shopId: shop.id, status: { in: ["FAILED", "PARTIAL", "SKIPPED"] } } }),
    ]);
    rows.push({
      shopId: shop.id,
      slug: shop.slug,
      name: shop.name,
      enabled: shop.enabled,
      needsConfiguration: shop.needsConfiguration,
      ingestionStatus: shop.ingestionStatus,
      lastIngestedAt: shop.lastIngestedAt?.toISOString() ?? null,
      rawOffers,
      confirmedOffers,
      parentProducts,
      publicProducts: new Set(productOffers.map((offer) => offer.productId)).size,
      variants,
      missingCategory,
      missingImage,
      missingPrice,
      needsReview,
      excludedFromPublic,
      failedRuns,
    });
  }

  const [rawOffers, canonicalProducts, parentProducts, variants, publicProducts, missingCategory, missingImage, missingPrice, needsReview, excludedFromPublic] =
    await Promise.all([
      prisma.rawOffer.count(),
      prisma.product.count(),
      prisma.parentProduct.count(),
      prisma.productVariant.count(),
      prisma.product.count({ where: { isPublic: true, archivedAt: null, needsReview: false, categoryNeedsReview: false } }),
      prisma.rawOffer.count({ where: { OR: [{ categorySlug: null }, { categoryNeedsReview: true }] } }),
      prisma.rawOffer.count({ where: { originalImageUrl: null } }),
      prisma.rawOffer.count({ where: { OR: [{ rawPrice: null }, { rawPrice: { lte: 0 } }] } }),
      prisma.rawOffer.count({ where: { status: { in: ["NEEDS_REVIEW", "UNABLE_TO_FETCH"] } } }),
      prisma.product.count({ where: { OR: [{ isPublic: false }, { archivedAt: { not: null } }, { needsReview: true }, { categoryNeedsReview: true }] } }),
    ]);

  return {
    stores: rows,
    totals: {
      rawOffers,
      canonicalProducts,
      parentProducts,
      publicProducts,
      variants,
      missingCategory,
      missingImage,
      missingPrice,
      needsReview,
      excludedFromPublic,
    },
  };
}
