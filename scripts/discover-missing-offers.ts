import "./load-env";
import { prisma } from "../src/lib/prisma";
import { verifyProductsAcrossStores } from "../src/server/jobs/verifyProductsAcrossStores";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");

async function main() {
  const options = parseBatchOptions("discover-missing-offers", { limit: 50 });
  const id = checkpointId("discover-missing-offers", options);
  const { products, results, nextCursor, nextOffset } = await verifyProductsAcrossStores({
    shop: options.shop,
    category: options.category,
    limit: options.limit,
    offset: options.offset,
    cursor: options.cursor,
    onlyPublic: true,
    dryRun: options.dryRun,
    safeMode: true,
  });

  const attachedOrConfirmed = results.reduce((sum, item) => sum + item.exactMatchesFound, 0);
  const possible = results.reduce((sum, item) => sum + item.possibleMatchesFound, 0);
  const failed = results.reduce((sum, item) => sum + item.failed, 0);
  const progress = {
    checkpointId: id,
    cursor: nextCursor,
    created: 0,
    updated: options.dryRun ? 0 : attachedOrConfirmed + possible,
    skipped: 0,
    failed,
    processed: products.length,
    nextOffset,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("discover-missing-offers", progress);
  console.log(`${options.dryRun ? "Would confirm/check" : "Confirmed/checked"} ${attachedOrConfirmed} exact shop matches; queued ${possible} possible matches.`);
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
