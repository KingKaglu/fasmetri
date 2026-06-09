import "./load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import {
  SAFE_MATCHER_VERSION,
  SafeCategorySlug,
  SafeProductIdentity,
  normalizeSafeOffer,
  readSafeIdentity,
  scoreSafeMatch,
} from "../src/server/matching/safeProductMatcher";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

type OfferForValidation = Prisma.ProductOfferGetPayload<{
  include: {
    rawOffer: { include: { shop: { select: { slug: true; name: true } } } };
    canonicalProduct: true;
  };
}>;

type PossibleForValidation = Prisma.PossibleMatchGetPayload<{
  include: {
    rawOffer: { include: { shop: { select: { slug: true; name: true } } } };
    canonicalProduct: true;
  };
}>;

type StoreCounts = {
  raw: number;
  matched: number;
  unmatched: number;
  auto: number;
  possible: number;
};

type ValidationReport = {
  matcherVersion: string;
  generatedAt: string;
  reportPath?: string;
  counts: {
    raw: number;
    matched: number;
    unmatched: number;
    auto: number;
    possible: number;
    rejected: number;
    duplicateCanonicals: number;
    categoryMismatches: number;
    brandConflicts: number;
    phoneConflicts: number;
    laptopConflicts: number;
    missingMetadata: number;
    multipleCanonicalLinks: number;
  };
  perStore: Record<string, StoreCounts>;
  duplicateCanonicals: Array<Record<string, unknown>>;
  hardFailures: Array<Record<string, unknown>>;
  autoExamples: Array<Record<string, unknown>>;
  reviewExamples: Array<Record<string, unknown>>;
};

const categories: SafeCategorySlug[] = ["mobiles", "laptops"];

async function main() {
  const report: ValidationReport = {
    matcherVersion: SAFE_MATCHER_VERSION,
    generatedAt: new Date().toISOString(),
    counts: {
      raw: 0,
      matched: 0,
      unmatched: 0,
      auto: 0,
      possible: 0,
      rejected: 0,
      duplicateCanonicals: 0,
      categoryMismatches: 0,
      brandConflicts: 0,
      phoneConflicts: 0,
      laptopConflicts: 0,
      missingMetadata: 0,
      multipleCanonicalLinks: 0,
    },
    perStore: {},
    duplicateCanonicals: [],
    hardFailures: [],
    autoExamples: [],
    reviewExamples: [],
  };

  const rawOffers = await db.rawOffer.findMany({
    where: { categorySlug: { in: categories }, categoryNeedsReview: false, rawPrice: { not: null } },
    include: {
      shop: { select: { slug: true, name: true } },
      productOffer: { select: { id: true, canonicalProductId: true, matchStatus: true } },
    },
  });
  report.counts.raw = rawOffers.length;
  for (const raw of rawOffers) {
    const store = storeBucket(report, raw.shop.slug);
    store.raw += 1;
    if (raw.productOffer?.canonicalProductId) store.matched += 1;
    else store.unmatched += 1;
  }

  const offers = await db.productOffer.findMany({
    where: {
      canonicalProductId: { not: null },
      rawOffer: { categorySlug: { in: categories } },
    },
    include: {
      rawOffer: { include: { shop: { select: { slug: true, name: true } } } },
      canonicalProduct: true,
    },
  });
  report.counts.matched = offers.length;
  report.counts.unmatched = rawOffers.filter((raw) => !raw.productOffer?.canonicalProductId).length;
  report.counts.auto = offers.filter((offer) => offer.matchStatus === "SAFE_AUTO").length;

  const possible = await db.possibleMatch.findMany({
    where: { matcherVersion: SAFE_MATCHER_VERSION },
    include: {
      rawOffer: { include: { shop: { select: { slug: true, name: true } } } },
      canonicalProduct: true,
    },
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
  });
  report.counts.possible = possible.filter((item) => item.status === "PENDING").length;
  report.counts.rejected = possible.filter((item) => item.status === "REJECTED").length;
  for (const item of possible) {
    const store = storeBucket(report, item.rawOffer.shop.slug);
    if (item.status === "PENDING") store.possible += 1;
    if (report.reviewExamples.length < 20 && item.status === "PENDING") {
      report.reviewExamples.push({
        shop: item.rawOffer.shop.slug,
        rawTitle: item.rawTitle,
        candidateTitle: item.candidateTitle,
        confidence: item.confidence,
        reason: item.reason,
      });
    }
  }

  const canonicalProducts = await db.canonicalProduct.findMany({
    select: { id: true, categorySlug: true, brand: true, familyKey: true, canonicalKey: true, title: true, specsJson: true },
  });
  const duplicateMap = new Map<string, typeof canonicalProducts>();
  for (const canonical of canonicalProducts) {
    const identity = readSafeIdentity(canonical.specsJson);
    const exactIdentityKey = identity?.exactKey;
    if (!exactIdentityKey) continue;
    const groupKey = [canonical.categorySlug, canonical.brand, exactIdentityKey].join("::");
    const group = duplicateMap.get(groupKey) ?? [];
    group.push(canonical);
    duplicateMap.set(groupKey, group);
  }
  const duplicateCanonicals = [...duplicateMap.values()].filter((group) => group.length > 1);
  report.counts.duplicateCanonicals = duplicateCanonicals.length;
  report.duplicateCanonicals = duplicateCanonicals.slice(0, 50).map((group) => ({
    categorySlug: group[0].categorySlug,
    brand: group[0].brand,
    exactKey: readSafeIdentity(group[0].specsJson)?.exactKey,
    count: group.length,
    examples: group.slice(0, 5).map((item) => ({ id: item.id, canonicalKey: item.canonicalKey, title: item.title })),
  }));

  const rawToCanonical = new Map<string, Set<string>>();
  for (const offer of offers) {
    if (!offer.rawOffer || !offer.canonicalProduct) continue;
    const set = rawToCanonical.get(offer.rawOffer.id) ?? new Set<string>();
    set.add(offer.canonicalProduct.id);
    rawToCanonical.set(offer.rawOffer.id, set);

    const store = storeBucket(report, offer.rawOffer.shop.slug);
    if (offer.matchStatus === "SAFE_AUTO") store.auto += 1;

    validateOffer(report, offer);
  }

  for (const [rawOfferId, set] of rawToCanonical) {
    if (set.size > 1) {
      report.counts.multipleCanonicalLinks += 1;
      hardFailure(report, "one raw offer linked to multiple canonicals", { rawOfferId, canonicalProductIds: [...set] });
    }
  }

  report.reportPath = writeReport(report);
  console.log(`Safe match validation report: ${report.reportPath}`);
  console.log(
    [
      `raw=${report.counts.raw}`,
      `matched=${report.counts.matched}`,
      `unmatched=${report.counts.unmatched}`,
      `auto=${report.counts.auto}`,
      `possible=${report.counts.possible}`,
      `rejected=${report.counts.rejected}`,
      `hardFailures=${report.hardFailures.length}`,
    ].join(" "),
  );

  if (report.hardFailures.length) process.exit(1);
}

function validateOffer(report: ValidationReport, offer: OfferForValidation) {
  const raw = offer.rawOffer;
  const canonical = offer.canonicalProduct;
  if (!raw || !canonical) return;

  const missingMetadata = offer.confidence == null || !offer.reason || !offer.matcherVersion || !offer.matchedAt;
  if (missingMetadata) {
    report.counts.missingMetadata += 1;
    hardFailure(report, "missing confidence/reason/matcherVersion/matchedAt", {
      offerId: offer.id,
      rawOfferId: raw.id,
      title: offer.title,
    });
  }

  const rawIdentity = normalizeSafeOffer({
    title: raw.originalTitle,
    categorySlug: raw.categorySlug,
    brand: raw.brand,
    model: raw.model,
    description: raw.description,
    specs: raw.rawSpecsJson,
    imageUrl: raw.originalImageUrl,
  });
  const canonicalIdentity =
    readSafeIdentity(canonical.specsJson) ??
    normalizeSafeOffer({
      title: canonical.title,
      categorySlug: canonical.categorySlug,
      brand: canonical.brand,
      specs: canonical.specsJson,
      imageUrl: canonical.primaryImage,
    });
  if (!rawIdentity || !canonicalIdentity) {
    hardFailure(report, "unable to normalize matched offer for validation", { offerId: offer.id, rawTitle: raw.originalTitle });
    return;
  }

  const decision = scoreSafeMatch(rawIdentity, canonicalIdentity);
  const auto = offer.matchStatus === "SAFE_AUTO";
  if (rawIdentity.kind !== canonicalIdentity.kind) {
    hardFailure(report, "phone matched with laptop/tablet/accessory", failureContext(offer, rawIdentity, canonicalIdentity, decision.reason));
  }
  if (rawIdentity.categorySlug !== canonical.categorySlug) {
    report.counts.categoryMismatches += 1;
    hardFailure(report, "category mismatch", failureContext(offer, rawIdentity, canonicalIdentity, decision.reason));
  }
  if (rawIdentity.brand && canonicalIdentity.brand && rawIdentity.brand !== canonicalIdentity.brand) {
    report.counts.brandConflicts += 1;
    if (auto) hardFailure(report, "different brands auto-matched", failureContext(offer, rawIdentity, canonicalIdentity, decision.reason));
  }

  const phoneConflicts = decision.hardConflicts.filter((reason) => reason.startsWith("phone "));
  const laptopConflicts = decision.hardConflicts.filter((reason) => reason.startsWith("laptop ") || reason.startsWith("MacBook"));
  if (phoneConflicts.length) report.counts.phoneConflicts += 1;
  if (laptopConflicts.length) report.counts.laptopConflicts += 1;

  if (auto && rawIdentity.kind === "phone" && phoneConflicts.length) {
    hardFailure(report, "phone conflict auto-matched", failureContext(offer, rawIdentity, canonicalIdentity, phoneConflicts.join("; ")));
  }
  if (
    auto &&
    rawIdentity.storageGb &&
    canonicalIdentity.storageGb &&
    rawIdentity.storageGb !== canonicalIdentity.storageGb
  ) {
    hardFailure(report, "different storage exact-matched", failureContext(offer, rawIdentity, canonicalIdentity, decision.reason));
  }
  if (
    auto &&
    rawIdentity.kind === "laptop" &&
    laptopConflicts.some((reason) => /\b(CPU|GPU|RAM|storage)\b/.test(reason))
  ) {
    hardFailure(report, "laptop CPU/GPU/RAM/storage conflict auto-matched", failureContext(offer, rawIdentity, canonicalIdentity, laptopConflicts.join("; ")));
  }

  if (auto && report.autoExamples.length < 20) {
    report.autoExamples.push({
      shop: raw.shop.slug,
      rawTitle: raw.originalTitle,
      canonicalTitle: canonical.title,
      confidence: offer.confidence,
      reason: offer.reason,
    });
  }
}

function failureContext(
  offer: OfferForValidation,
  rawIdentity: SafeProductIdentity,
  canonicalIdentity: SafeProductIdentity,
  reason: string,
) {
  return {
    offerId: offer.id,
    rawOfferId: offer.rawOffer?.id,
    rawTitle: offer.rawOffer?.originalTitle,
    canonicalProductId: offer.canonicalProduct?.id,
    canonicalTitle: offer.canonicalProduct?.title,
    matchStatus: offer.matchStatus,
    confidence: offer.confidence,
    reason,
    rawIdentity,
    canonicalIdentity,
  };
}

function hardFailure(report: ValidationReport, type: string, details: Record<string, unknown>) {
  report.hardFailures.push({ type, ...details });
}

function storeBucket(report: ValidationReport, shopSlug: string): StoreCounts {
  report.perStore[shopSlug] ??= { raw: 0, matched: 0, unmatched: 0, auto: 0, possible: 0 };
  return report.perStore[shopSlug];
}

function writeReport(report: ValidationReport) {
  mkdirSync("reports", { recursive: true });
  const path = join("reports", `validate-matches-${timestamp()}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
