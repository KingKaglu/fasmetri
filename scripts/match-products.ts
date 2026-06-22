import "./load-env";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OfferAvailability, Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normalizeProductName, slugifyProduct } from "../src/lib/matching";
import { prettifyProductName } from "../src/lib/productDisplay";
import {
  SAFE_MATCHER_VERSION,
  SafeCategorySlug,
  SafeMatchDecision,
  SafeProductIdentity,
  identitySummary,
  normalizeSafeCategory,
  normalizeSafeOffer,
  readSafeIdentity,
  scoreSafeMatch,
} from "../src/server/matching/safeProductMatcher";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

type RawForMatch = Prisma.RawOfferGetPayload<{
  include: {
    shop: { select: { id: true; slug: true; name: true } };
    productOffer: {
      select: {
        id: true;
        canonicalProductId: true;
        confidence: true;
        reason: true;
        matcherVersion: true;
        matchedAt: true;
        matchStatus: true;
        currentPrice: true;
        lastPriceChangedAt: true;
      };
    };
  };
}>;

type CanonicalForMatch = Prisma.CanonicalProductGetPayload<{
  select: {
    id: true;
    categorySlug: true;
    brand: true;
    familyKey: true;
    canonicalKey: true;
    title: true;
    normalizedTitle: true;
    primaryImage: true;
    specsJson: true;
    productId: true;
  };
}>;

type CandidateDecision = {
  candidate: CanonicalForMatch;
  identity: SafeProductIdentity;
  decision: SafeMatchDecision;
};

type MatchReport = {
  matcherVersion: string;
  dryRun: boolean;
  categories: SafeCategorySlug[];
  processed: number;
  createdCanonicals: number;
  createdOffers: number;
  updatedOffers: number;
  skipped: number;
  auto: number;
  possible: number;
  rejected: number;
  failed: number;
  reportPath?: string;
  autoExamples: Array<Record<string, unknown>>;
  reviewExamples: Array<Record<string, unknown>>;
  failures: Array<Record<string, unknown>>;
};

async function main() {
  const options = parseBatchOptions("match-products", { limit: 200 });
  const categories = categoriesForOption(options.category);
  const id = checkpointId("match-products", { ...options, category: categories.join(",") });
  const report: MatchReport = {
    matcherVersion: SAFE_MATCHER_VERSION,
    dryRun: options.dryRun,
    categories,
    processed: 0,
    createdCanonicals: 0,
    createdOffers: 0,
    updatedOffers: 0,
    skipped: 0,
    auto: 0,
    possible: 0,
    rejected: 0,
    failed: 0,
    autoExamples: [],
    reviewExamples: [],
    failures: [],
  };

  const rawOffers = await db.rawOffer.findMany({
    where: {
      id: options.cursor ? { gt: options.cursor } : undefined,
      shop: options.shop ? { slug: options.shop } : undefined,
      categorySlug: categories.length === 1 ? categories[0] : { in: categories },
      categoryNeedsReview: false,
      rawPrice: { not: null },
      originalTitle: options.q ? { contains: options.q, mode: "insensitive" } : undefined,
      status: { notIn: ["EXCLUDED", "UNABLE_TO_FETCH", "PARSE_FAILED", "DUPLICATE_URL", "STORE_UNAVAILABLE", "BLOCKED_OR_UNABLE_TO_FETCH"] },
    },
    include: {
      shop: { select: { id: true, slug: true, name: true } },
      productOffer: {
        select: {
          id: true,
          canonicalProductId: true,
          confidence: true,
          reason: true,
          matcherVersion: true,
          matchedAt: true,
          matchStatus: true,
          currentPrice: true,
          lastPriceChangedAt: true,
        },
      },
    },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });

  const categoryIds = await categoryIdMap(categories);

  for (const raw of rawOffers) {
    report.processed += 1;
    try {
      if (isCurrentSafeLink(raw)) {
        report.skipped += 1;
        continue;
      }

      const identity = normalizeSafeOffer({
        title: raw.originalTitle,
        categorySlug: raw.categorySlug,
        brand: raw.brand,
        model: raw.model,
        description: raw.description,
        specs: raw.rawSpecsJson,
        imageUrl: raw.originalImageUrl,
      });
      if (!identity?.brand) {
        report.rejected += 1;
        addFailure(report, raw, "Missing brand after safe normalization.");
        continue;
      }
      // For phones/laptops: model or modelCode required.
      // For consoles: consoleFamily required.
      // For accessories: accessoryModel or consoleFamily required.
      const hasModel =
        identity.model ||
        identity.modelCode ||
        (identity.kind === "console" && identity.consoleFamily) ||
        (identity.kind === "accessory" && (identity.accessoryModel || identity.consoleFamily));
      if (!hasModel) {
        report.rejected += 1;
        addFailure(report, raw, "Missing model/modelCode/consoleFamily after safe normalization.");
        continue;
      }

      const candidates = await loadCandidates(identity);
      const decisions = candidates
        .map((candidate) => scoreCandidate(identity, candidate))
        .filter((item): item is CandidateDecision => Boolean(item))
        .sort((left, right) => right.decision.confidence - left.decision.confidence);
      report.rejected += decisions.filter((item) => item.decision.band === "REJECTED").length;

      // A confident link is normally never moved silently (a PossibleMatch is queued
      // instead). But if the offer's CURRENT canonical now hard-conflicts with the
      // offer's own identity under the active matcher — e.g. a stale v1 canonical
      // whose specsJson carries a corrupt RAM ("…|1|…") that the offer's true RAM
      // rejects — that link is stale, not trustworthy. Let such an offer re-home to a
      // correct canonical instead of leaving a wrong-RAM auto-match live forever.
      const currentLinkConflicts = Boolean(
        raw.productOffer?.canonicalProductId &&
          decisions.some(
            (item) => item.candidate.id === raw.productOffer?.canonicalProductId && item.decision.band === "REJECTED",
          ),
      );

      const bestAuto = decisions.find((item) => item.decision.band === "AUTO");
      if (bestAuto) {
        if (!currentLinkConflicts && raw.productOffer?.canonicalProductId && raw.productOffer.canonicalProductId !== bestAuto.candidate.id && (raw.productOffer.confidence ?? 0) >= autoThreshold(identity)) {
          await maybeWritePossible(raw, bestAuto, options.dryRun);
          report.possible += 1;
          addReviewExample(report, raw, bestAuto, "Existing good safe match was not moved automatically.");
          continue;
        }

        const canonical = bestAuto.candidate;
        const productId = await ensureLegacyProduct(canonical, bestAuto.identity, categoryIds.get(identity.categorySlug), false, options.dryRun);
        if (!options.dryRun && productId && canonical.productId !== productId) {
          await db.canonicalProduct.update({ where: { id: canonical.id }, data: { productId, lastMatchedAt: new Date() } });
        }
        const offerResult = await upsertOffer(raw, canonical.id, productId ?? canonical.productId, identity, {
          confidence: bestAuto.decision.confidence,
          reason: bestAuto.decision.reason,
          status: "SAFE_AUTO",
          needsReview: false,
          dryRun: options.dryRun,
        });
        await closePendingPossible(raw.id, options.dryRun);
        report.auto += 1;
        if (offerResult === "created") report.createdOffers += 1;
        if (offerResult === "updated") report.updatedOffers += 1;
        addAutoExample(report, raw, canonical, bestAuto);
        continue;
      }

      // An existing canonical whose canonicalKey is byte-identical to this offer's
      // exactKey is the SAME SKU (brand|model/code|cpu|gpu|ram|storage|screen|color
      // all equal). The additive scorer can still land below WEAK (e.g. when a spec
      // is unknown on one side and caps the score), which previously spawned a
      // duplicate `…|raw_<hash>` canonical. Link to the existing canonical instead —
      // unless the offer is already confidently linked elsewhere, in which case queue
      // a PossibleMatch rather than silently moving it.
      const exactKeyMatch = identity.exactKey
        ? decisions.find((item) => item.decision.band !== "REJECTED" && item.candidate.canonicalKey === identity.exactKey)
        : undefined;
      if (exactKeyMatch) {
        if (
          !currentLinkConflicts &&
          raw.productOffer?.canonicalProductId &&
          raw.productOffer.canonicalProductId !== exactKeyMatch.candidate.id &&
          (raw.productOffer.confidence ?? 0) >= autoThreshold(identity)
        ) {
          await maybeWritePossible(raw, exactKeyMatch, options.dryRun);
          report.possible += 1;
          addReviewExample(report, raw, exactKeyMatch, "ExactKey collision but offer already confidently linked; queued for review.");
          continue;
        }
        const canonical = exactKeyMatch.candidate;
        const productId = await ensureLegacyProduct(canonical, exactKeyMatch.identity, categoryIds.get(identity.categorySlug), false, options.dryRun);
        if (!options.dryRun && productId && canonical.productId !== productId) {
          await db.canonicalProduct.update({ where: { id: canonical.id }, data: { productId, lastMatchedAt: new Date() } });
        }
        const offerResult = await upsertOffer(raw, canonical.id, productId ?? canonical.productId, identity, {
          confidence: Math.max(exactKeyMatch.decision.confidence, autoThreshold(identity)),
          reason: `Linked on identical exactKey ${identity.exactKey}. ${exactKeyMatch.decision.reason}`,
          status: "SAFE_AUTO",
          needsReview: false,
          dryRun: options.dryRun,
        });
        await closePendingPossible(raw.id, options.dryRun);
        report.auto += 1;
        if (offerResult === "created") report.createdOffers += 1;
        if (offerResult === "updated") report.updatedOffers += 1;
        addAutoExample(report, raw, canonical, exactKeyMatch);
        continue;
      }

      const possible = decisions.filter((item) => item.decision.band === "REVIEW" || item.decision.band === "WEAK").slice(0, 5);
      for (const item of possible) {
        await maybeWritePossible(raw, item, options.dryRun);
        report.possible += 1;
        addReviewExample(report, raw, item);
      }
      // Normally REVIEW/WEAK candidates mean "leave the offer where it is and let an
      // admin decide". But if the offer's current link hard-conflicts (stale wrong-RAM
      // canonical) and no AUTO/exactKey re-home was possible, we must NOT leave it on
      // the conflicting canonical — fall through to give it its own correct canonical
      // (the queued PossibleMatch still lets an admin merge it to a variant later).
      if (possible.length > 0 && !currentLinkConflicts) {
        continue;
      }

      const ownKey = ownCanonicalKey(identity, raw.id, possible, candidates);
      const canonical = await ensureCanonical(raw, identity, ownKey, false, categoryIds.get(identity.categorySlug), options.dryRun);
      if (canonical.created) report.createdCanonicals += 1;
      const offerResult = await upsertOffer(raw, canonical.id, canonical.productId, identity, {
        confidence: 100,
        reason: "Created canonical product; no safe same-category same-brand candidate.",
        status: possible.length ? "CANONICAL_CREATED_NEEDS_REVIEW" : "CANONICAL_CREATED",
        needsReview: false,
        dryRun: options.dryRun,
      });
      if (offerResult === "created") report.createdOffers += 1;
      if (offerResult === "updated") report.updatedOffers += 1;
    } catch (error) {
      report.failed += 1;
      addFailure(report, raw, error instanceof Error ? error.message : "Unknown safe matching error.");
    }
  }

  const progress = {
    checkpointId: id,
    cursor: rawOffers.at(-1)?.id ?? options.cursor,
    created: options.dryRun ? 0 : report.createdOffers + report.createdCanonicals,
    updated: options.dryRun ? 0 : report.updatedOffers,
    skipped: report.skipped,
    failed: report.failed,
    processed: rawOffers.length,
    nextOffset: options.offset + rawOffers.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("match-products", progress);
  report.reportPath = writeReport(report, "match-products");
  console.log(`Safe matching report: ${report.reportPath}`);
  console.log(`auto=${report.auto} possible=${report.possible} rejected=${report.rejected} createdCanonicals=${report.createdCanonicals}`);
}

function categoriesForOption(category?: string): SafeCategorySlug[] {
  const normalized = normalizeSafeCategory(category);
  if (category && !normalized) return [];
  return normalized ? [normalized] : ["mobiles", "laptops"];
}

async function categoryIdMap(categories: SafeCategorySlug[]) {
  const rows = await db.category.findMany({ where: { slug: { in: categories } }, select: { id: true, slug: true } });
  return new Map(rows.map((row) => [row.slug as SafeCategorySlug, row.id]));
}

function isCurrentSafeLink(raw: RawForMatch) {
  const offer = raw.productOffer;
  if (!offer?.canonicalProductId || !offer.confidence || !offer.reason || offer.matcherVersion !== SAFE_MATCHER_VERSION || !offer.matchedAt) return false;
  const rawChangedAt = maxDate(raw.updatedAt, raw.scrapedAt);
  return offer.matchedAt >= rawChangedAt;
}

async function loadCandidates(identity: SafeProductIdentity) {
  if (!identity.brand) return [];
  return db.canonicalProduct.findMany({
    where: {
      categorySlug: identity.categorySlug,
      brand: identity.brand,
    },
    select: {
      id: true,
      categorySlug: true,
      brand: true,
      familyKey: true,
      canonicalKey: true,
      title: true,
      normalizedTitle: true,
      primaryImage: true,
      specsJson: true,
      productId: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
}

function scoreCandidate(identity: SafeProductIdentity, candidate: CanonicalForMatch): CandidateDecision | undefined {
  const candidateIdentity =
    readSafeIdentity(candidate.specsJson) ??
    normalizeSafeOffer({
      title: candidate.title,
      categorySlug: candidate.categorySlug,
      brand: candidate.brand,
      specs: candidate.specsJson,
      imageUrl: candidate.primaryImage,
    });
  if (!candidateIdentity) return undefined;
  return {
    candidate,
    identity: candidateIdentity,
    decision: scoreSafeMatch(identity, candidateIdentity),
  };
}

async function ensureCanonical(
  raw: RawForMatch,
  identity: SafeProductIdentity,
  canonicalKey: string,
  needsReview: boolean,
  categoryId: string | undefined,
  dryRun: boolean,
) {
  const title = canonicalTitle(identity, raw.originalTitle);
  if (dryRun) {
    return { id: `dry_${shortHash(canonicalKey)}`, productId: `dry_product_${shortHash(canonicalKey)}`, created: true };
  }

  const existing = await db.canonicalProduct.findUnique({ where: { canonicalKey }, select: { id: true, productId: true } });
  const canonical = await db.canonicalProduct.upsert({
    where: { canonicalKey },
    update: {
      title,
      normalizedTitle: normalizeProductName(title),
      primaryImage: raw.originalImageUrl ?? undefined,
      specsJson: jsonValue(identity),
      matcherVersion: SAFE_MATCHER_VERSION,
      lastMatchedAt: new Date(),
    },
    create: {
      categorySlug: identity.categorySlug,
      brand: identity.brand ?? "unknown",
      familyKey: identity.familyKey ?? canonicalKey,
      canonicalKey,
      title,
      normalizedTitle: normalizeProductName(title),
      primaryImage: raw.originalImageUrl,
      specsJson: jsonValue(identity),
      matcherVersion: SAFE_MATCHER_VERSION,
      lastMatchedAt: new Date(),
    },
    select: {
      id: true,
      categorySlug: true,
      brand: true,
      familyKey: true,
      canonicalKey: true,
      title: true,
      normalizedTitle: true,
      primaryImage: true,
      specsJson: true,
      productId: true,
    },
  });

  const productId = await ensureLegacyProduct(canonical, identity, categoryId, needsReview, false);
  if (productId && canonical.productId !== productId) {
    await db.canonicalProduct.update({ where: { id: canonical.id }, data: { productId } });
  }

  return { id: canonical.id, productId: productId ?? canonical.productId, created: !existing };
}

async function ensureLegacyProduct(
  canonical: Pick<CanonicalForMatch, "productId" | "canonicalKey" | "title" | "primaryImage">,
  identity: SafeProductIdentity,
  categoryId: string | undefined,
  needsReview: boolean,
  dryRun: boolean,
) {
  if (dryRun) return canonical.productId ?? `dry_product_${shortHash(canonical.canonicalKey)}`;
  const data = {
    name: canonical.title,
    normalizedName: normalizeProductName(canonical.title),
    canonicalKey: canonical.canonicalKey,
    productIdentity: jsonValue(identity),
    brand: identity.brand,
    model: identity.model ?? identity.modelCode,
    imageUrl: canonical.primaryImage,
    categoryId,
    categoryConfidence: 100,
    categoryNeedsReview: false,
    categorySuggestedSlug: identity.categorySlug,
    categoryReason: `Safe canonical matcher ${SAFE_MATCHER_VERSION}.`,
    isPublic: !needsReview,
    needsReview,
    archivedAt: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;

  if (canonical.productId) {
    const updated = await db.product.update({ where: { id: canonical.productId }, data });
    return updated.id;
  }

  const existing = await db.product.findFirst({ where: { canonicalKey: canonical.canonicalKey }, select: { id: true } });
  if (existing) {
    const updated = await db.product.update({ where: { id: existing.id }, data });
    return updated.id;
  }

  const slug = stableSlug(canonical.title, canonical.canonicalKey);
  try {
    const created = await db.product.create({ data: { ...data, slug } as Prisma.ProductUncheckedCreateInput });
    return created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const created = await db.product.create({
        data: { ...data, slug: `${slug}-${shortHash(canonical.canonicalKey).slice(0, 6)}` } as Prisma.ProductUncheckedCreateInput,
      });
      return created.id;
    }
    throw error;
  }
}

async function upsertOffer(
  raw: RawForMatch,
  canonicalProductId: string,
  productId: string | null | undefined,
  identity: SafeProductIdentity,
  options: { confidence: number; reason: string; status: string; needsReview: boolean; dryRun: boolean },
) {
  if (!productId) throw new Error("ProductOffer requires a legacy Product productId.");
  if (!raw.rawPrice) throw new Error("RawOffer is missing rawPrice.");
  if (options.dryRun) return raw.productOffer ? "updated" : "created";

  const existing =
    raw.productOffer ??
    (await db.productOffer.findFirst({
      where: { OR: [{ rawOfferId: raw.id }, { shopId: raw.shopId, url: raw.originalUrl }] },
      select: {
        id: true,
        canonicalProductId: true,
        confidence: true,
        reason: true,
        matcherVersion: true,
        matchedAt: true,
        matchStatus: true,
        currentPrice: true,
        lastPriceChangedAt: true,
      },
    }));
  const price = Number(raw.rawPrice);
  const oldPrice = raw.rawOldPrice == null ? undefined : Number(raw.rawOldPrice);
  const changed = existing ? Number(existing.currentPrice) !== price : true;
  const data = {
    productId,
    rawOfferId: raw.id,
    canonicalProductId,
    externalId: raw.externalId,
    title: raw.originalTitle,
    canonicalKey: identity.exactKey,
    productIdentity: jsonValue(identity),
    matchStatus: options.status,
    matchConfidence: options.confidence,
    verificationStatus: options.needsReview ? "NEEDS_REVIEW" : "CONFIRMED",
    currentPrice: price,
    oldPrice,
    discountPercent: raw.rawDiscount ?? discountPercent(price, oldPrice),
    availability: raw.availability as OfferAvailability,
    imageUrl: raw.originalImageUrl,
    lastSeenAt: raw.scrapedAt,
    lastPriceChangedAt: changed ? new Date() : existing?.lastPriceChangedAt,
    confidence: options.confidence,
    reason: options.reason,
    matcherVersion: SAFE_MATCHER_VERSION,
    matchedAt: new Date(),
  } satisfies Prisma.ProductOfferUncheckedUpdateInput;

  let offer;
  try {
    offer = existing
      ? await db.productOffer.update({ where: { id: existing.id }, data })
      : await db.productOffer.create({
          data: {
            ...data,
            shopId: raw.shopId,
            url: raw.originalUrl,
          } as Prisma.ProductOfferUncheckedCreateInput,
        });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      raw.externalId &&
      String((error.meta as { target?: unknown } | undefined)?.target ?? "").includes("externalId")
    ) {
      offer = existing
        ? await db.productOffer.update({ where: { id: existing.id }, data: { ...data, externalId: null } })
        : await db.productOffer.create({
            data: {
              ...data,
              externalId: null,
              shopId: raw.shopId,
              url: raw.originalUrl,
            } as Prisma.ProductOfferUncheckedCreateInput,
          });
    } else {
      throw error;
    }
  }

  if (changed) await db.priceHistory.create({ data: { offerId: offer.id, price, oldPrice } });
  return existing ? "updated" : "created";
}

async function maybeWritePossible(raw: RawForMatch, item: CandidateDecision, dryRun: boolean) {
  if (dryRun) return;
  // Hard-conflicted pairs (e.g. different colors) must never reach the review queue.
  if (item.decision.band === "REJECTED" || item.decision.confidence <= 0) return;
  await db.possibleMatch.upsert({
    where: {
      rawOfferId_canonicalProductId_matcherVersion: {
        rawOfferId: raw.id,
        canonicalProductId: item.candidate.id,
        matcherVersion: SAFE_MATCHER_VERSION,
      },
    },
    update: {
      confidence: item.decision.confidence,
      reason: item.decision.reason,
      rawTitle: raw.originalTitle,
      candidateTitle: item.candidate.title,
      evidence: jsonValue({
        rawIdentity: item.identity.source.title === raw.originalTitle ? undefined : raw.originalTitle,
        candidateIdentity: item.identity,
        decision: item.decision,
      }),
      // Never reset status: an APPROVED/REJECTED decision from admin review
      // must survive matcher re-runs.
      matchedAt: new Date(),
    },
    create: {
      rawOfferId: raw.id,
      canonicalProductId: item.candidate.id,
      shopId: raw.shopId,
      confidence: item.decision.confidence,
      reason: item.decision.reason,
      matcherVersion: SAFE_MATCHER_VERSION,
      rawTitle: raw.originalTitle,
      candidateTitle: item.candidate.title,
      evidence: jsonValue({ candidateIdentity: item.identity, decision: item.decision }),
    },
  });
}

async function closePendingPossible(rawOfferId: string, dryRun: boolean) {
  if (dryRun) return;
  await db.possibleMatch.updateMany({
    where: { rawOfferId, matcherVersion: SAFE_MATCHER_VERSION, status: "PENDING" },
    data: { status: "REJECTED" },
  });
}

function ownCanonicalKey(identity: SafeProductIdentity, rawOfferId: string, possible: CandidateDecision[], candidates: CanonicalForMatch[]) {
  const exactKey = identity.exactKey ?? `${identity.categorySlug}|${identity.brand ?? "unknown"}|${identity.model ?? identity.modelCode ?? "unknown"}`;
  const exactKeyAlreadyExists = candidates.some((candidate) => candidate.canonicalKey === exactKey);
  if (possible.length || exactKeyAlreadyExists) return `${exactKey}|raw_${shortHash(rawOfferId)}`;
  return exactKey;
}

function canonicalTitle(identity: SafeProductIdentity, fallback: string) {
  const summary = identitySummary(identity);
  return summary ? prettifyProductName(summary) : fallback;
}

function autoThreshold(identity: SafeProductIdentity) {
  return 85;
}

function discountPercent(price: number, oldPrice?: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function maxDate(...dates: Date[]) {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function stableSlug(title: string, key: string) {
  return `${slugifyProduct(title)}-${shortHash(key).slice(0, 8)}`;
}

function shortHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function addAutoExample(report: MatchReport, raw: RawForMatch, canonical: CanonicalForMatch, item: CandidateDecision) {
  if (report.autoExamples.length >= 20) return;
  report.autoExamples.push({
    shop: raw.shop.slug,
    rawTitle: raw.originalTitle,
    canonicalTitle: canonical.title,
    confidence: item.decision.confidence,
    reason: item.decision.reason,
  });
}

function addReviewExample(report: MatchReport, raw: RawForMatch, item: CandidateDecision, note?: string) {
  if (report.reviewExamples.length >= 20) return;
  report.reviewExamples.push({
    shop: raw.shop.slug,
    rawTitle: raw.originalTitle,
    candidateTitle: item.candidate.title,
    confidence: item.decision.confidence,
    reason: note ? `${note} ${item.decision.reason}` : item.decision.reason,
  });
}

function addFailure(report: MatchReport, raw: RawForMatch, reason: string) {
  if (report.failures.length >= 20) return;
  report.failures.push({ shop: raw.shop.slug, rawTitle: raw.originalTitle, reason });
}

function writeReport(report: MatchReport, prefix: string) {
  mkdirSync("reports", { recursive: true });
  const path = join("reports", `${prefix}-${timestamp()}.json`);
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
