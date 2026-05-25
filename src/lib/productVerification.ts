import {
  OfferAvailability,
  Prisma,
  ProductVerificationStatus,
  StoreVerificationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { attachConfirmedOfferToProduct } from "@/lib/crossStoreMatching";
import { productIdentity } from "@/lib/offerDiscovery";
import { readProductIdentity, extractProductIdentity } from "@/lib/productIdentity";
import { explainMatchDecision, MatchDecision } from "@/lib/productMatching";
import { StoreCandidate, findStoreCandidates } from "@/lib/storeProductSearch";
import { recordOfferVerificationEvidence, verificationNotes } from "@/lib/verificationEvidence";

type VerificationProduct = Prisma.ProductGetPayload<{
  include: {
    category: true;
    offers: { include: { shop: true } };
  };
}>;

export type VerifyProductsOptions = {
  dryRun?: boolean;
  safeMode?: boolean;
  shop?: string;
};

export async function verifyProductAcrossStores(productId: string, options: VerifyProductsOptions = {}) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, offers: { include: { shop: true } } },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  const shops = await prisma.shop.findMany({
    where: {
      enabled: true,
      needsConfiguration: false,
      slug: options.shop,
    },
    orderBy: { name: "asc" },
  });
  const verification = options.dryRun
    ? null
    : await prisma.productVerification.create({
        data: {
          productId,
          status: ProductVerificationStatus.IN_PROGRESS,
          startedAt: new Date(),
          totalEnabledShopsCount: shops.length,
        },
      });

  let checkedShopsCount = 0;
  let exactMatchesFound = 0;
  let possibleMatchesFound = 0;
  let rejectedCandidatesCount = 0;
  let failed = 0;
  const identity = productIdentity(product);

  for (const shop of shops) {
    checkedShopsCount += 1;
    const existing = product.offers.find((offer) => offer.shopId === shop.id && offer.matchStatus === "CONFIRMED");
    if (existing) {
      exactMatchesFound += 1;
      if (!options.dryRun) {
        await upsertStoreVerification({
          productId,
          shopId: shop.id,
          status: StoreVerificationStatus.EXACT_MATCH_FOUND,
          matchedOfferId: existing.id,
          candidateTitle: existing.title,
          candidateUrl: existing.url,
          candidatePrice: Number(existing.currentPrice),
          candidateImage: existing.imageUrl,
          matchConfidence: existing.matchConfidence ?? 100,
          evidenceNotes: "Existing confirmed offer already attached to this canonical product.",
        });
      }
      continue;
    }

    try {
      const candidates = await findStoreCandidates({ identity, shopId: shop.id, limit: 40 });
      const decisions = candidates
        .map((candidate) => ({ candidate, decision: decisionForCandidate(product, candidate) }))
        .sort((left, right) => right.decision.confidence - left.decision.confidence);
      const confirmed = decisions.find(({ decision }) => decision.status === "CONFIRMED");
      const possible = decisions.find(({ decision }) => decision.status === "POSSIBLE");

      if (confirmed) {
        exactMatchesFound += 1;
        if (!options.dryRun) {
          const offerId = await attachCandidate(product.id, confirmed.candidate, confirmed.decision);
          await upsertStoreVerification({
            productId,
            shopId: shop.id,
            status: StoreVerificationStatus.EXACT_MATCH_FOUND,
            matchedOfferId: offerId,
            candidateTitle: confirmed.candidate.originalTitle,
            candidateUrl: confirmed.candidate.originalUrl,
            candidatePrice: Number(confirmed.candidate.rawPrice),
            candidateImage: confirmed.candidate.originalImageUrl,
            matchConfidence: confirmed.decision.confidence,
            mismatchReasons: confirmed.decision.hardMismatchReasons,
            evidenceNotes: verificationNotes(confirmed.decision),
          });
        }
        continue;
      }

      if (possible) {
        possibleMatchesFound += 1;
        if (!options.dryRun) {
          await prisma.possibleProductMatch.upsert({
            where: { id: `${product.id}:${possible.candidate.id}` },
            update: {
              confidence: possible.decision.confidence,
              reason: verificationNotes(possible.decision),
              status: "PENDING",
            },
            create: {
              id: `${product.id}:${possible.candidate.id}`,
              productId,
              rawOfferId: possible.candidate.id,
              candidateOfferId: possible.candidate.productOffer?.id,
              shopId: shop.id,
              candidateTitle: possible.candidate.originalTitle,
              candidateUrl: possible.candidate.originalUrl,
              confidence: possible.decision.confidence,
              reason: verificationNotes(possible.decision),
            },
          });
          await upsertStoreVerification({
            productId,
            shopId: shop.id,
            status: StoreVerificationStatus.POSSIBLE_MATCH_NEEDS_REVIEW,
            candidateTitle: possible.candidate.originalTitle,
            candidateUrl: possible.candidate.originalUrl,
            candidatePrice: Number(possible.candidate.rawPrice),
            candidateImage: possible.candidate.originalImageUrl,
            matchConfidence: possible.decision.confidence,
            mismatchReasons: possible.decision.hardMismatchReasons,
            evidenceNotes: verificationNotes(possible.decision),
          });
        }
        continue;
      }

      const rejected = decisions.filter(({ decision }) => decision.hardMismatchReasons.length).length;
      rejectedCandidatesCount += rejected;
      if (!options.dryRun) {
        await upsertStoreVerification({
          productId,
          shopId: shop.id,
          status: rejected ? StoreVerificationStatus.DIFFERENT_VARIANT_REJECTED : StoreVerificationStatus.NO_MATCH_FOUND,
          mismatchReasons: decisions.slice(0, 5).flatMap(({ decision }) => decision.hardMismatchReasons),
          evidenceNotes: rejected
            ? "Candidates were found, but strict variant rules rejected them."
            : "No imported raw offer matched this product identity in this shop.",
        });
      }
    } catch (error) {
      failed += 1;
      if (!options.dryRun) {
        await upsertStoreVerification({
          productId,
          shopId: shop.id,
          status: StoreVerificationStatus.SEARCH_FAILED,
          evidenceNotes: error instanceof Error ? error.message : "Unknown store verification error.",
        });
      }
    }
  }

  const finalStatus = failed
    ? ProductVerificationStatus.PARTIALLY_VERIFIED
    : possibleMatchesFound
      ? ProductVerificationStatus.NEEDS_REVIEW
      : ProductVerificationStatus.VERIFIED_FULLY;

  if (!options.dryRun) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        crossStoreCheckedAt: new Date(),
        checkedShopsCount,
        totalEnabledShopsCount: shops.length,
        missingOfferDiscoveryStatus: finalStatus === ProductVerificationStatus.VERIFIED_FULLY ? "CHECKED" : "PARTIAL",
      },
    });
    await prisma.productVerification.update({
      where: { id: verification!.id },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
        checkedShopsCount,
        totalEnabledShopsCount: shops.length,
        exactMatchesFound,
        possibleMatchesFound,
        rejectedCandidatesCount,
        errorMessage: failed ? `${failed} store checks failed.` : null,
      },
    });
  }

  return {
    productId,
    title: product.name,
    status: finalStatus,
    checkedShopsCount,
    totalEnabledShopsCount: shops.length,
    exactMatchesFound,
    possibleMatchesFound,
    rejectedCandidatesCount,
    failed,
  };
}

function decisionForCandidate(product: VerificationProduct, candidate: StoreCandidate) {
  const productIdentityValue = readProductIdentity(product.productIdentity) ?? extractProductIdentity({
    title: product.name,
    brand: product.brand,
    model: product.model,
    categorySlug: product.category?.slug,
  });
  const offerIdentity = readProductIdentity(candidate.productIdentity) ?? extractProductIdentity({
    title: candidate.originalTitle,
    description: candidate.description,
    brand: candidate.brand,
    model: candidate.model,
    categorySlug: candidate.categorySlug ?? product.category?.slug,
    breadcrumbs: candidate.breadcrumbs as string[] | null,
  });
  return explainMatchDecision(productIdentityValue, offerIdentity);
}

async function attachCandidate(productId: string, candidate: StoreCandidate, decision: MatchDecision) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  if (candidate.productOffer) {
    await attachConfirmedOfferToProduct(productId, candidate.productOffer.id, decision);
    await recordOfferVerificationEvidence({
      offerId: candidate.productOffer.id,
      shopId: candidate.shopId,
      originalTitle: candidate.originalTitle,
      originalUrl: candidate.originalUrl,
      decision,
    });
    return candidate.productOffer.id;
  }

  if (!candidate.rawPrice || Number(candidate.rawPrice) <= 0) throw new Error(`Raw offer has no valid price: ${candidate.id}`);
  const offer = await prisma.productOffer.upsert({
    where: { shopId_url: { shopId: candidate.shopId, url: candidate.originalUrl } },
    update: {
      productId,
      rawOfferId: candidate.id,
      externalId: candidate.externalId,
      title: candidate.originalTitle,
      currentPrice: candidate.rawPrice,
      oldPrice: candidate.rawOldPrice,
      availability: candidate.availability as OfferAvailability,
      imageUrl: candidate.originalImageUrl,
      canonicalKey: decision.right.canonicalKey,
      productIdentity: jsonValue(decision.right),
      matchStatus: "CONFIRMED",
      matchConfidence: decision.confidence,
      verificationStatus: "CONFIRMED",
      lastSeenAt: candidate.scrapedAt,
    },
    create: {
      productId,
      shopId: candidate.shopId,
      rawOfferId: candidate.id,
      externalId: candidate.externalId,
      url: candidate.originalUrl,
      title: candidate.originalTitle,
      currentPrice: candidate.rawPrice,
      oldPrice: candidate.rawOldPrice,
      availability: candidate.availability as OfferAvailability,
      imageUrl: candidate.originalImageUrl,
      canonicalKey: decision.right.canonicalKey,
      productIdentity: jsonValue(decision.right),
      matchStatus: "CONFIRMED",
      matchConfidence: decision.confidence,
      verificationStatus: "CONFIRMED",
      discountPercent: discountPercent(Number(candidate.rawPrice), candidate.rawOldPrice ? Number(candidate.rawOldPrice) : undefined),
      lastSeenAt: candidate.scrapedAt,
    },
  });
  await prisma.rawOffer.update({
    where: { id: candidate.id },
    data: { productId, status: "ATTACHED", processedAt: new Date() },
  });
  await recordOfferVerificationEvidence({
    offerId: offer.id,
    shopId: candidate.shopId,
    originalTitle: candidate.originalTitle,
    originalUrl: candidate.originalUrl,
    decision,
  });
  return offer.id;
}

async function upsertStoreVerification(data: {
  productId: string;
  shopId: string;
  status: StoreVerificationStatus;
  matchedOfferId?: string;
  candidateUrl?: string | null;
  candidateTitle?: string | null;
  candidatePrice?: number | null;
  candidateImage?: string | null;
  matchConfidence?: number | null;
  mismatchReasons?: string[];
  evidenceNotes?: string | null;
}) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  return prisma.productStoreVerification.upsert({
    where: { productId_shopId: { productId: data.productId, shopId: data.shopId } },
    update: {
      status: data.status,
      checkedAt: new Date(),
      matchedOfferId: data.matchedOfferId,
      candidateUrl: data.candidateUrl,
      candidateTitle: data.candidateTitle,
      candidatePrice: data.candidatePrice,
      candidateImage: data.candidateImage,
      matchConfidence: data.matchConfidence,
      mismatchReasons: jsonValue(data.mismatchReasons ?? []),
      evidenceNotes: data.evidenceNotes,
    },
    create: {
      productId: data.productId,
      shopId: data.shopId,
      status: data.status,
      matchedOfferId: data.matchedOfferId,
      candidateUrl: data.candidateUrl,
      candidateTitle: data.candidateTitle,
      candidatePrice: data.candidatePrice,
      candidateImage: data.candidateImage,
      matchConfidence: data.matchConfidence,
      mismatchReasons: jsonValue(data.mismatchReasons ?? []),
      evidenceNotes: data.evidenceNotes,
    },
  });
}

function discountPercent(price: number, oldPrice?: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
