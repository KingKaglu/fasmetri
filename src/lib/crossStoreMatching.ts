import { Prisma } from "@prisma/client";
import { explainMatchDecision, MatchDecision } from "@/lib/productMatching";
import { extractProductIdentity, readProductIdentity } from "@/lib/productIdentity";
import { prisma } from "@/lib/prisma";

type MatchProduct = {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  category?: { slug: string } | null;
  canonicalKey?: string | null;
  productIdentity?: unknown;
};

type MatchOffer = {
  id: string;
  title: string;
  productId: string;
  canonicalKey?: string | null;
  productIdentity?: unknown;
  product?: { matchingLocked?: boolean } | null;
};

export function matchOfferToProduct(product: MatchProduct, offer: MatchOffer) {
  return explainOfferMatchDecision(product, offer);
}

export function explainOfferMatchDecision(product: MatchProduct, offer: MatchOffer): MatchDecision {
  return explainMatchDecision(
    readProductIdentity(product.productIdentity) ?? extractProductIdentity({
      title: product.name,
      brand: product.brand,
      model: product.model,
      categorySlug: product.category?.slug,
    }),
    readProductIdentity(offer.productIdentity) ?? extractProductIdentity({
      title: offer.title,
      categorySlug: product.category?.slug,
    }),
  );
}

export async function attachConfirmedOfferToProduct(productId: string, offerId: string, decision?: MatchDecision) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  return prisma.productOffer.update({
    where: { id: offerId },
    data: {
      productId,
      matchStatus: "CONFIRMED",
      matchConfidence: decision?.confidence ?? 100,
      verificationStatus: "CONFIRMED",
      canonicalKey: decision?.left.canonicalKey ?? decision?.right.canonicalKey,
      productIdentity: decision ? jsonValue(decision.right) : undefined,
    },
  });
}

export async function markPossibleOfferMatch(productId: string, offerId: string, confidence: number, decision?: MatchDecision) {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const existing = await prisma.offerMatchCandidate.findUnique({
    where: { productId_offerId: { productId, offerId } },
    select: { status: true },
  });
  if (existing?.status === "REJECTED") return null;
  return prisma.offerMatchCandidate.upsert({
    where: { productId_offerId: { productId, offerId } },
    update: {
      confidence,
      reasons: jsonValue(decision ? [...decision.reasons, ...decision.hardMismatchReasons] : []),
      attributes: jsonValue(decision ? { product: decision.left, offer: decision.right } : {}),
      status: "POSSIBLE",
    },
    create: {
      productId,
      offerId,
      confidence,
      reasons: jsonValue(decision ? [...decision.reasons, ...decision.hardMismatchReasons] : []),
      attributes: jsonValue(decision ? { product: decision.left, offer: decision.right } : {}),
    },
  });
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
