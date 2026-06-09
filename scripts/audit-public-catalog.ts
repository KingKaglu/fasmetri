import "./load-env";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { extractProductIdentity } from "../src/lib/productIdentity";
import { explainMatchDecision } from "../src/lib/productMatching";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;
const publicOfferWhere = {
  currentPrice: { gt: 0 },
  shop: { enabled: true },
  matchStatus: "CONFIRMED",
  verificationStatus: "CONFIRMED",
} satisfies Prisma.ProductOfferWhereInput;

async function main() {
  const options = parseBatchOptions("audit-public-catalog", { limit: 200 });
  // This script demotes offers and un-publishes products, and its legacy
  // explainMatchDecision scoring is not calibrated for safe-matcher catalogs
  // (it flags identical-title single-store offers at confidence 89). Destructive
  // catalog operations must default to dry-run; pass --apply to write.
  if (!process.argv.includes("--apply")) {
    options.dryRun = true;
    console.log("audit-public-catalog: dry-run (pass --apply to write changes)");
  }
  const id = checkpointId("audit-public-catalog", options);
  const products = await db.product.findMany({
    where: {
      id: options.cursor ? { gt: options.cursor } : undefined,
      isPublic: true,
      archivedAt: null,
      needsReview: false,
      categoryNeedsReview: false,
      categorySuggestedSlug: options.category,
      offers: { some: publicOfferWhere },
    },
    include: {
      category: true,
      offers: {
        where: publicOfferWhere,
        include: { shop: true },
        orderBy: { currentPrice: "asc" },
      },
    },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    processed += 1;
    const baseIdentity = extractProductIdentity({
      title: product.name,
      brand: product.brand,
      model: product.model,
      categorySlug: product.categorySuggestedSlug ?? product.category?.slug,
      imageUrl: product.imageUrl,
    });
    let confirmedOffers = 0;

    for (const offer of product.offers) {
      try {
        const decision = explainMatchDecision(
          baseIdentity,
          extractProductIdentity({
            title: offer.title,
            categorySlug: product.categorySuggestedSlug ?? product.category?.slug,
            imageUrl: offer.imageUrl,
          }),
        );
        const valid =
          decision.status === "CONFIRMED" &&
          offer.matchStatus === "CONFIRMED" &&
          offer.verificationStatus === "CONFIRMED" &&
          (offer.matchConfidence == null || offer.matchConfidence >= 90);

        if (valid) {
          confirmedOffers += 1;
          continue;
        }

        if (decision.status === "CONFIRMED" && decision.confidence >= 90) {
          confirmedOffers += 1;
          if (!options.dryRun) {
            await db.productOffer.update({
              where: { id: offer.id },
              data: {
                matchStatus: "CONFIRMED",
                matchConfidence: decision.confidence,
                verificationStatus: "CONFIRMED",
              },
            });
            updated += 1;
          }
          continue;
        }

        skipped += 1;
        console.log(`[mismatch] ${product.name} -> ${offer.shop.slug}: ${offer.title}`);
        console.log(`  status=${decision.status} confidence=${decision.confidence} reasons=${decision.hardMismatchReasons.join("; ")}`);

        if (!options.dryRun) {
          await db.productOffer.update({
            where: { id: offer.id },
            data: {
              matchStatus: decision.status === "POSSIBLE" ? "POSSIBLE" : "REJECTED",
              matchConfidence: decision.confidence,
              verificationStatus: "NEEDS_REVIEW",
            },
          });
          updated += 1;
        }
      } catch (error) {
        failed += 1;
        console.error(error instanceof Error ? error.message : error);
      }
    }

    if (!confirmedOffers && !options.dryRun) {
      await db.product.update({
        where: { id: product.id },
        data: {
          isPublic: false,
          needsReview: true,
          missingOfferDiscoveryStatus: "NEEDS_MATCHING_REVIEW",
        } satisfies Prisma.ProductUncheckedUpdateInput,
      });
      updated += 1;
    }
  }

  const progress = {
    checkpointId: id,
    cursor: products.at(-1)?.id ?? options.cursor,
    processed,
    created: 0,
    updated,
    skipped,
    failed,
    nextOffset: options.offset + products.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("audit-public-catalog", progress);
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
