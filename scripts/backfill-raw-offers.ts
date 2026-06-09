import "./load-env";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { isPublicCategorySlug } from "../src/config/categoryMapping";
import { categorizeProduct } from "../src/lib/categorizeProduct";
import { extractProductIdentity } from "../src/lib/productIdentity";
import { normalizeProductTitle, removeNoiseWords } from "../src/lib/productNormalization";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

async function main() {
  const options = parseBatchOptions("backfill-raw-offers", { limit: 200 });
  const id = checkpointId("backfill-raw-offers", options);
  const offers = await db.productOffer.findMany({
    where: {
      id: options.cursor ? { gt: options.cursor } : undefined,
      shop: options.shop ? { slug: options.shop } : undefined,
      rawOfferId: null,
    },
    include: { shop: true, product: { include: { category: true } } },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });

  let created = 0;
  let updated = 0;
  let failed = 0;
  for (const offer of offers) {
    try {
      const categoryDecision = categorizeProduct({
        title: offer.title,
        brand: offer.product.brand,
        model: offer.product.model,
        scrapedShopCategory: offer.product.category?.slug,
        sourceShop: offer.shop.slug,
        imageAlt: offer.title,
        breadcrumbs: [offer.url, offer.product.category?.slug].filter(Boolean) as string[],
      });
      const identity = extractProductIdentity({
        title: offer.title,
        brand: offer.product.brand,
        model: offer.product.model,
        categorySlug: categoryDecision.publicCategorySlug,
      });
      const publicCategory = isPublicCategorySlug(categoryDecision.publicCategorySlug);
      if (options.dryRun) {
        created += 1;
        continue;
      }
      const raw = await db.rawOffer.upsert({
        where: { shopId_originalUrl: { shopId: offer.shopId, originalUrl: offer.url } },
        update: {
          productId: offer.productId,
          externalId: offer.externalId,
          originalTitle: offer.title,
          originalImageUrl: offer.imageUrl,
          rawPrice: offer.currentPrice,
          rawOldPrice: offer.oldPrice,
          availability: offer.availability,
          rawCategory: offer.product.category?.slug,
          normalizedTitle: normalizeProductTitle(offer.title),
          cleanTitle: removeNoiseWords(offer.title),
          canonicalKey: identity.canonicalKey,
          productIdentity: jsonValue(identity),
          categorySlug: categoryDecision.publicCategorySlug,
          categoryConfidence: categoryDecision.confidenceScore,
          categoryNeedsReview: categoryDecision.needsReview || !publicCategory,
          status: "ATTACHED",
          processedAt: new Date(),
        },
        create: {
          shopId: offer.shopId,
          productId: offer.productId,
          externalId: offer.externalId,
          originalTitle: offer.title,
          originalUrl: offer.url,
          originalImageUrl: offer.imageUrl,
          rawPrice: offer.currentPrice,
          rawOldPrice: offer.oldPrice,
          availability: offer.availability,
          rawCategory: offer.product.category?.slug,
          normalizedTitle: normalizeProductTitle(offer.title),
          cleanTitle: removeNoiseWords(offer.title),
          canonicalKey: identity.canonicalKey,
          productIdentity: jsonValue(identity),
          categorySlug: categoryDecision.publicCategorySlug,
          categoryConfidence: categoryDecision.confidenceScore,
          categoryNeedsReview: categoryDecision.needsReview || !publicCategory,
          status: "ATTACHED",
          processedAt: new Date(),
        },
      });
      await db.productOffer.update({
        where: { id: offer.id },
        data: {
          rawOfferId: raw.id,
          canonicalKey: offer.canonicalKey ?? identity.canonicalKey,
          productIdentity: offer.productIdentity ?? jsonValue(identity),
          matchStatus: "CONFIRMED",
          verificationStatus: "CONFIRMED",
        },
      });
      created += 1;
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`Backfill failed for ${offer.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const progress = {
    checkpointId: id,
    cursor: offers.at(-1)?.id ?? options.cursor,
    created: options.dryRun ? 0 : created,
    updated: options.dryRun ? 0 : updated,
    skipped: options.dryRun ? created : 0,
    failed,
    processed: offers.length,
    nextOffset: options.offset + offers.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("backfill-raw-offers", progress);
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
