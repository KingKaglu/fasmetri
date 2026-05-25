import "./load-env";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

async function main() {
  const options = parseBatchOptions("archive-current-products", { limit: 200 });
  const id = checkpointId("archive-current-products", options);
  const confirmed = process.env.CONFIRM_DATA_ARCHIVE === "true";
  const archiveAll = process.argv.includes("--all");
  const where: Prisma.ProductWhereInput = {
    id: options.cursor ? { gt: options.cursor } : undefined,
    category: options.category ? { slug: options.category } : undefined,
    offers: options.shop ? { some: { shop: { slug: options.shop } } } : undefined,
    OR: archiveAll
      ? undefined
      : [
          { categoryNeedsReview: true },
          { needsReview: true },
          { offers: { none: {} } },
          { offers: { some: { OR: [{ matchStatus: { not: "CONFIRMED" } }, { currentPrice: { lte: 0 } }] } } },
        ],
  };
  const products = await db.product.findMany({
    where,
    select: { id: true, name: true, archivedAt: true },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });

  let updated = 0;
  let skipped = 0;
  for (const product of products) {
    if (product.archivedAt) {
      skipped += 1;
      continue;
    }
    console.log(`${options.dryRun || !confirmed ? "Would archive/hide" : "Archiving/hiding"} ${product.id} ${product.name}`);
    if (!options.dryRun && confirmed) {
      await db.product.update({
        where: { id: product.id },
        data: {
          isPublic: false,
          needsReview: true,
          archivedAt: new Date(),
          missingOfferDiscoveryStatus: "ARCHIVED_NEEDS_REVIEW",
        },
      });
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  if (!confirmed && !options.dryRun) {
    console.log("Non-destructive safety: set CONFIRM_DATA_ARCHIVE=true to write archive flags. No products were changed.");
  }
  const progress = {
    checkpointId: id,
    cursor: products.at(-1)?.id ?? options.cursor,
    processed: products.length,
    created: 0,
    updated,
    skipped,
    failed: 0,
    nextOffset: options.offset + products.length,
  };
  if (!options.dryRun && confirmed) writeCheckpoint(options.checkpoint, progress);
  logProgress("archive-current-products", progress);
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
