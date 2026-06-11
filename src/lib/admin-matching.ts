import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { normalizeProductName, slugifyProduct } from "@/lib/matching";
import { prettifyProductName } from "@/lib/productDisplay";
import { prisma } from "@/lib/prisma";
import {
  SAFE_MATCHER_VERSION,
  SafeProductIdentity,
  identitySummary,
  normalizeSafeOffer,
} from "@/server/matching/safeProductMatcher";

type Db = NonNullable<typeof prisma>;

function requireDb(): Db {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  return prisma;
}

function shortHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isExternalIdConflict(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return String((error.meta as { target?: unknown } | undefined)?.target ?? "").includes("externalId");
  }
  return error instanceof Error && error.message.includes("externalId");
}

type RawForIdentity = {
  originalTitle: string;
  categorySlug: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  rawSpecsJson: Prisma.JsonValue;
  originalImageUrl: string | null;
};

function rawIdentity(raw: RawForIdentity) {
  return normalizeSafeOffer({
    title: raw.originalTitle,
    categorySlug: raw.categorySlug,
    brand: raw.brand,
    model: raw.model,
    description: raw.description,
    specs: raw.rawSpecsJson,
    imageUrl: raw.originalImageUrl,
  });
}

type CanonicalForLegacy = {
  id: string;
  productId: string | null;
  canonicalKey: string;
  title: string;
  primaryImage: string | null;
  categorySlug: string;
};

// Mirrors ensureLegacyProduct in scripts/match-products.ts: every canonical
// needs a legacy Product row because ProductOffer.productId is required and
// the public catalog still reads legacy products.
async function ensureLegacyProduct(db: Db, canonical: CanonicalForLegacy, identity?: SafeProductIdentity) {
  const category = await db.category.findUnique({ where: { slug: canonical.categorySlug }, select: { id: true } });
  const data = {
    name: canonical.title,
    normalizedName: normalizeProductName(canonical.title),
    canonicalKey: canonical.canonicalKey,
    productIdentity: identity ? jsonValue(identity) : undefined,
    brand: identity?.brand,
    model: identity?.model ?? identity?.modelCode,
    imageUrl: canonical.primaryImage,
    categoryId: category?.id,
    categoryConfidence: 100,
    categoryNeedsReview: false,
    categorySuggestedSlug: canonical.categorySlug,
    categoryReason: "Manually reviewed in admin.",
    isPublic: true,
    needsReview: false,
    archivedAt: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;

  let productId = canonical.productId;
  if (productId) {
    await db.product.update({ where: { id: productId }, data });
    return productId;
  }

  const existing = await db.product.findFirst({ where: { canonicalKey: canonical.canonicalKey }, select: { id: true } });
  if (existing) {
    await db.product.update({ where: { id: existing.id }, data });
    productId = existing.id;
  } else {
    const slug = slugifyProduct(canonical.title) || `product-${shortHash(canonical.canonicalKey)}`;
    try {
      const created = await db.product.create({ data: { ...data, slug } as Prisma.ProductUncheckedCreateInput });
      productId = created.id;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const created = await db.product.create({
        data: { ...data, slug: `${slug}-${shortHash(canonical.canonicalKey).slice(0, 6)}` } as Prisma.ProductUncheckedCreateInput,
      });
      productId = created.id;
    }
  }

  await db.canonicalProduct.update({ where: { id: canonical.id }, data: { productId } });
  return productId;
}

export async function approvePossibleMatch(matchId: string) {
  const db = requireDb();
  const match = await db.possibleMatch.findUnique({
    where: { id: matchId },
    include: {
      rawOffer: { include: { productOffer: { select: { id: true } } } },
      canonicalProduct: true,
    },
  });
  if (!match) throw new Error("Possible match not found.");
  if (match.status !== "PENDING") return { status: match.status };

  const raw = match.rawOffer;
  const identity = rawIdentity(raw) ?? undefined;
  const productId = await ensureLegacyProduct(db, match.canonicalProduct, identity);

  // confidence=100 + current matcherVersion keeps the matcher from silently
  // moving a manually approved offer to a different canonical later.
  const data = {
    // rawOfferId is a no-op when the offer was found through raw.productOffer,
    // but links the RawOffer when the offer was only found by (shopId, url).
    rawOfferId: raw.id,
    productId,
    canonicalProductId: match.canonicalProductId,
    canonicalKey: identity?.exactKey ?? match.canonicalProduct.canonicalKey,
    productIdentity: identity ? jsonValue(identity) : undefined,
    title: raw.originalTitle,
    matchStatus: "CONFIRMED",
    matchConfidence: match.confidence,
    verificationStatus: "CONFIRMED" as const,
    confidence: 100,
    reason: `Manually approved in admin review (matcher confidence ${match.confidence}).`,
    matcherVersion: SAFE_MATCHER_VERSION,
    matchedAt: new Date(),
  } satisfies Prisma.ProductOfferUncheckedUpdateInput;

  const existing =
    raw.productOffer ??
    (await db.productOffer.findFirst({
      where: { OR: [{ rawOfferId: raw.id }, { shopId: raw.shopId, url: raw.originalUrl }] },
      select: { id: true },
    }));

  if (existing) {
    await db.productOffer.update({ where: { id: existing.id }, data });
  } else {
    if (raw.rawPrice == null) throw new Error("RawOffer has no price; cannot create an offer.");
    const createData = {
      ...data,
      rawOfferId: raw.id,
      shopId: raw.shopId,
      url: raw.originalUrl,
      externalId: raw.externalId,
      currentPrice: Number(raw.rawPrice),
      oldPrice: raw.rawOldPrice == null ? undefined : Number(raw.rawOldPrice),
      availability: raw.availability,
      imageUrl: raw.originalImageUrl,
    } as Prisma.ProductOfferUncheckedCreateInput;
    try {
      await db.productOffer.create({ data: createData });
    } catch (error) {
      if (!isExternalIdConflict(error)) throw error;
      await db.productOffer.create({ data: { ...createData, externalId: null } });
    }
  }

  await db.canonicalProduct.update({ where: { id: match.canonicalProductId }, data: { lastMatchedAt: new Date() } });
  await db.possibleMatch.update({ where: { id: match.id }, data: { status: "APPROVED" } });
  await db.possibleMatch.updateMany({
    where: { rawOfferId: raw.id, status: "PENDING", id: { not: match.id } },
    data: { status: "REJECTED" },
  });
  return { status: "APPROVED" as const };
}

export async function rejectPossibleMatch(matchId: string) {
  const db = requireDb();
  const match = await db.possibleMatch.findUnique({ where: { id: matchId }, select: { id: true, status: true } });
  if (!match) throw new Error("Possible match not found.");
  if (match.status !== "PENDING") return { status: match.status };
  await db.possibleMatch.update({ where: { id: match.id }, data: { status: "REJECTED" } });
  return { status: "REJECTED" as const };
}

export async function bulkApprovePossibleMatches(minConfidence: number, categorySlug?: string) {
  const db = requireDb();
  const pending = await db.possibleMatch.findMany({
    where: {
      status: "PENDING",
      confidence: { gte: minConfidence },
      canonicalProduct: categorySlug ? { categorySlug } : undefined,
    },
    orderBy: { confidence: "desc" },
    take: 300,
    select: { id: true },
  });

  let approved = 0;
  let skipped = 0;
  const failures: string[] = [];
  for (const row of pending) {
    try {
      const result = await approvePossibleMatch(row.id);
      if (result.status === "APPROVED") approved += 1;
      else skipped += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Unknown error.");
    }
  }
  return { matched: pending.length, approved, skipped, failed: failures.length, failures: failures.slice(0, 5) };
}

// Undo a bad merge: give the offer its own canonical (raw_-suffixed key, the
// same convention the matcher uses for ambiguous offers) and link it there
// with confidence 100 so the matcher never auto-merges it back.
export async function unlinkOffer(offerId: string) {
  const db = requireDb();
  const offer = await db.productOffer.findUnique({
    where: { id: offerId },
    include: {
      rawOffer: true,
      canonicalProduct: { select: { id: true, categorySlug: true } },
    },
  });
  if (!offer) throw new Error("Offer not found.");

  const raw = offer.rawOffer;
  const identity = raw ? rawIdentity(raw) ?? undefined : undefined;
  const categorySlug = identity?.categorySlug ?? offer.canonicalProduct?.categorySlug ?? raw?.categorySlug ?? "mobiles";
  const exactKey = identity?.exactKey ?? `${categorySlug}|manual|${shortHash(offer.url)}`;
  const ownKey = `${exactKey}|raw_${shortHash(raw?.id ?? offer.id)}`;
  const summary = identity ? identitySummary(identity) : undefined;
  const title = summary ? prettifyProductName(summary) : offer.title;

  const canonical = await db.canonicalProduct.upsert({
    where: { canonicalKey: ownKey },
    update: { lastMatchedAt: new Date() },
    create: {
      categorySlug,
      brand: identity?.brand ?? "unknown",
      familyKey: identity?.familyKey ?? ownKey,
      canonicalKey: ownKey,
      title,
      normalizedTitle: normalizeProductName(title),
      primaryImage: offer.imageUrl,
      specsJson: jsonValue(identity ?? { manual: true }),
      matcherVersion: SAFE_MATCHER_VERSION,
      lastMatchedAt: new Date(),
    },
    select: { id: true, productId: true, canonicalKey: true, title: true, primaryImage: true, categorySlug: true },
  });

  const productId = await ensureLegacyProduct(db, canonical, identity);
  await db.productOffer.update({
    where: { id: offer.id },
    data: {
      productId,
      canonicalProductId: canonical.id,
      canonicalKey: identity?.exactKey ?? offer.canonicalKey,
      matchStatus: "CANONICAL_CREATED",
      matchConfidence: 100,
      verificationStatus: "CONFIRMED",
      confidence: 100,
      reason: "Manually unlinked in admin; offer moved to its own product.",
      matcherVersion: SAFE_MATCHER_VERSION,
      matchedAt: new Date(),
    },
  });

  if (raw && offer.canonicalProductId) {
    await db.possibleMatch.updateMany({
      where: { rawOfferId: raw.id, canonicalProductId: offer.canonicalProductId, status: "PENDING" },
      data: { status: "REJECTED" },
    });
  }
  return { canonicalProductId: canonical.id, productId };
}
