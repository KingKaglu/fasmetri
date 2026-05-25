import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractProductIdentity, mergeProductIdentities, ProductIdentity, readProductIdentity } from "@/lib/productIdentity";
import {
  attachConfirmedOfferToProduct,
  markPossibleOfferMatch,
  matchOfferToProduct,
} from "@/lib/crossStoreMatching";

type DiscoveryProduct = Prisma.ProductGetPayload<{
  include: {
    category: true;
    offers: { include: { shop: true } };
  };
}>;

export type DiscoveryIdentity = {
  productId: string;
  terms: string[];
  excludedOfferIds: string[];
  identity: ProductIdentity;
};

export type OfferDiscoveryOptions = {
  dryRun?: boolean;
};

export async function discoverOffersForProduct(productId: string, options: OfferDiscoveryOptions = {}) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, offers: { include: { shop: true } } },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  const totalEnabledShopsCount = await prisma.shop.count({
    where: { enabled: true, needsConfiguration: false },
  });
  if (product.matchingLocked) {
    if (!options.dryRun) await updateDiscoveryStatus(product.id, totalEnabledShopsCount, "LOCKED");
    return { productId, attached: 0, possible: 0, checkedShopsCount: totalEnabledShopsCount, locked: true };
  }

  const identity = productIdentity(product);
  if (!identity.identity.canonicalKey) {
    if (!options.dryRun) await updateDiscoveryStatus(product.id, totalEnabledShopsCount, "REVIEW");
    return { productId, attached: 0, possible: 0, checkedShopsCount: 0, locked: false };
  }
  if (!options.dryRun && (product.canonicalKey !== identity.identity.canonicalKey || !product.productIdentity)) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        canonicalKey: identity.identity.canonicalKey,
        productIdentity: jsonValue(identity.identity),
      },
    });
  }
  const canonicalLeader = await prisma.product.findFirst({
    where: {
      canonicalKey: identity.identity.canonicalKey,
      matchingLocked: false,
      offers: { some: {} },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (canonicalLeader && canonicalLeader.id !== product.id) {
    if (!options.dryRun) await updateDiscoveryStatus(product.id, totalEnabledShopsCount, "CANONICAL_DUPLICATE");
    return { productId, attached: 0, possible: 0, checkedShopsCount: totalEnabledShopsCount, locked: false };
  }
  const candidates = await findCandidateOffersAcrossStores(identity);
  let attached = 0;
  let possible = 0;

  for (const offer of candidates) {
    if (offer.productId === product.id || offer.product.matchingLocked) continue;
    const decision = matchOfferToProduct(product, offer);
    if (decision.status === "CONFIRMED") {
      if (!options.dryRun) {
        await attachConfirmedOfferToProduct(product.id, offer.id, decision);
        const merged = mergeProductIdentities(identity.identity, decision.right);
        await prisma.product.update({
          where: { id: product.id },
          data: { canonicalKey: merged.canonicalKey, productIdentity: jsonValue(merged) },
        });
        identity.identity = merged;
      }
      attached += 1;
    } else if (decision.status === "POSSIBLE") {
      if (!options.dryRun) await markPossibleOfferMatch(product.id, offer.id, decision.confidence, decision);
      possible += 1;
    }
  }

  if (!options.dryRun) await updateDiscoveryStatus(product.id, totalEnabledShopsCount, possible ? "REVIEW" : "CHECKED");
  return { productId, attached, possible, checkedShopsCount: totalEnabledShopsCount, locked: false };
}

export async function findCandidateOffersAcrossStores(identity: DiscoveryIdentity) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  if (!identity.identity.canonicalKey) return [];
  return prisma.productOffer.findMany({
    where: {
      id: { notIn: identity.excludedOfferIds },
      shop: { enabled: true, needsConfiguration: false },
      canonicalKey: identity.identity.canonicalKey,
    },
    include: {
      shop: true,
      product: { select: { id: true, matchingLocked: true } },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 80,
  });
}

export function productIdentity(product: DiscoveryProduct): DiscoveryIdentity {
  const identity = readProductIdentity(product.productIdentity) ?? extractProductIdentity({
    title: product.name,
    brand: product.brand,
    model: product.model,
    categorySlug: product.category?.slug,
    breadcrumbs: product.offers.map((offer) => offer.title),
  });
  const exactTerms = [identity.sku, identity.modelCode].filter((term): term is string => Boolean(term));
  const broadTerms = [
    identity.model?.replaceAll("_", " "),
    ...identity.attributes.typeTokens.filter((token) => token.length >= 4 && /\d|iphone|galaxy|macbook|laptop|watch|buds|tv/.test(token)),
  ].filter((term): term is string => Boolean(term));
  return {
    productId: product.id,
    identity,
    terms: [...new Set([...exactTerms, ...broadTerms])],
    excludedOfferIds: product.offers.map((offer) => offer.id),
  };
}

async function updateDiscoveryStatus(productId: string, totalEnabledShopsCount: number, status: string) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  return prisma.product.update({
    where: { id: productId },
    data: {
      crossStoreCheckedAt: new Date(),
      checkedShopsCount: totalEnabledShopsCount,
      totalEnabledShopsCount,
      missingOfferDiscoveryStatus: status,
    },
  });
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
