import "./load-env";
import { prisma } from "../src/lib/prisma";
import { verifyProductsAcrossStores } from "../src/server/jobs/verifyProductsAcrossStores";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");

async function main() {
  const options = parseBatchOptions("verify-products", { limit: 20 });
  const id = checkpointId("verify-products", options);
  const productId = process.argv.slice(2).find((arg) => arg.startsWith("--productId="))?.split("=").slice(1).join("=");
  const onlyNeedsReview = process.argv.includes("--only-needs-review");
  const onlyPublic = process.argv.includes("--only-public");
  const safeMode = !process.argv.includes("--unsafe-mode");

  const { products, results, nextCursor, nextOffset } = await verifyProductsAcrossStores({
    productId,
    query: options.q,
    shop: options.shop,
    category: options.category,
    limit: options.limit,
    offset: options.offset,
    cursor: options.cursor,
    onlyNeedsReview,
    onlyPublic,
    dryRun: options.dryRun,
    safeMode,
  });

  const progress = {
    checkpointId: id,
    cursor: nextCursor,
    processed: products.length,
    created: 0,
    updated: options.dryRun ? 0 : results.reduce((sum, item) => sum + item.exactMatchesFound + item.possibleMatchesFound, 0),
    skipped: results.filter((item) => item.totalEnabledShopsCount === 0).length,
    failed: results.reduce((sum, item) => sum + item.failed, 0),
    nextOffset,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("verify-products", progress);
  if (options.dryRun) console.log("Dry run: verification statuses and offer attachments were not written.");
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
