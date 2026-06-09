import "./load-env";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { isPublicCategorySlug } from "../src/config/categoryMapping";
import { categorizeProduct } from "../src/lib/categorizeProduct";
import { explainMatchDecision } from "../src/lib/productMatching";
import { normalizeProductTitle, removeNoiseWords } from "../src/lib/productNormalization";
import { extractVariantIdentity } from "../src/lib/variantMatching";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

async function main() {
  const options = parseBatchOptions("normalize-raw-offers", { limit: 200 });
  const id = checkpointId("normalize-raw-offers", options);
  const rawOffers = await db.rawOffer.findMany({
    where: {
      id: options.cursor ? { gt: options.cursor } : undefined,
      shop: options.shop ? { slug: options.shop } : undefined,
      OR: options.q
        ? [
            { originalTitle: { contains: options.q, mode: "insensitive" } },
            { normalizedTitle: { contains: options.q.toLocaleLowerCase(), mode: "insensitive" } },
          ]
        : undefined,
      categorySlug: options.category ? options.category : undefined,
      status: { notIn: ["EXCLUDED", "UNABLE_TO_FETCH"] },
    },
    include: { shop: { select: { slug: true } } },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });

  let updated = 0;
  let review = 0;
  let failed = 0;

  for (const raw of rawOffers) {
    try {
      const decision = categorizeProduct({
        title: raw.originalTitle,
        description: raw.description ?? undefined,
        scrapedShopCategory: raw.rawCategory ?? raw.sourceCategory ?? undefined,
        breadcrumbs: toStringArray(raw.breadcrumbs ?? raw.sourceBreadcrumbs),
        brand: raw.brand ?? undefined,
        model: raw.model ?? undefined,
        imageAlt: raw.imageAlt ?? undefined,
        sourceShop: raw.shop.slug,
      });
      const identity = extractVariantIdentity({
        title: raw.originalTitle,
        description: raw.description ?? undefined,
        brand: raw.brand ?? undefined,
        model: raw.model ?? undefined,
        categorySlug: decision.publicCategorySlug,
        breadcrumbs: toStringArray(raw.breadcrumbs ?? raw.sourceBreadcrumbs),
        imageUrl: raw.originalImageUrl ?? undefined,
        price: raw.rawPrice == null ? undefined : Number(raw.rawPrice),
        oldPrice: raw.rawOldPrice == null ? undefined : Number(raw.rawOldPrice),
        discount: raw.rawDiscount,
        stockStatus: raw.availability,
      });
      const publicCategory = isPublicCategorySlug(decision.publicCategorySlug);
      const identityDecision = explainMatchDecision(identity, identity);
      const needsReview =
        decision.needsReview ||
        !publicCategory ||
        !identity.canonicalParentKey ||
        !identity.canonicalVariantKey ||
        identityDecision.status !== "CONFIRMED";
      if (needsReview) review += 1;

      if (!options.dryRun) {
        await db.rawOffer.update({
          where: { id: raw.id },
          data: {
            normalizedTitle: normalizeProductTitle(raw.originalTitle),
            cleanTitle: removeNoiseWords(raw.originalTitle),
            canonicalKey: identity.canonicalVariantKey ?? identity.canonicalKey,
            productIdentity: jsonValue(identity),
            categorySlug: decision.publicCategorySlug,
            categoryConfidence: decision.confidenceScore,
            categoryNeedsReview: needsReview,
            status: needsReview ? "NEEDS_REVIEW" : "NORMALIZED",
            processedAt: new Date(),
            errorMessage: needsReview
              ? [...identityDecision.missingAttributes, ...identityDecision.hardMismatchReasons, ...identityDecision.reasons].join(" ") ||
                "Normalized identity is not strong enough for automatic matching."
              : null,
          },
        });
      }
      updated += 1;
    } catch (error) {
      failed += 1;
      if (!options.dryRun) {
        await db.rawOffer.update({
          where: { id: raw.id },
          data: {
            status: "NEEDS_REVIEW",
            errorMessage: error instanceof Error ? error.message : "Unknown normalization error",
          },
        });
      }
    }
  }

  const progress = {
    checkpointId: id,
    cursor: rawOffers.at(-1)?.id ?? options.cursor,
    created: 0,
    updated: options.dryRun ? 0 : updated,
    skipped: review,
    failed,
    processed: rawOffers.length,
    nextOffset: options.offset + rawOffers.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("normalize-raw-offers", progress);
  console.log(`${options.dryRun ? "Would normalize" : "Normalized"} ${updated} raw offers. ${review} need review or stronger identity.`);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
