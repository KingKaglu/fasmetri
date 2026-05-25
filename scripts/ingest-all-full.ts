import "./load-env";
import { adapters } from "../src/server/scrapers/shops";
import { scrapeShop } from "../src/server/scrapers/runner";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

async function main() {
  const options = parseBatchOptions("ingest-all-full", { limit: 100 });
  const id = checkpointId("ingest-all-full", options);
  process.env.SCRAPER_ENABLED = "true";
  const targets = adapters.filter((adapter) => {
    if (options.shop && adapter.slug !== options.shop) return false;
    return adapter.enabledByDefault && !adapter.needsConfiguration;
  });

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const adapter of targets) {
    console.log(`Full ingest batch ${adapter.slug}: limit=${options.limit} offset=${options.offset}${options.dryRun ? " dry-run" : ""}${options.rawOnly ? " raw-only" : ""}`);
    const result = await scrapeShop(adapter.slug, {
      category: options.category,
      dryRun: options.dryRun,
      importBatchId: id,
      limit: options.limit,
      offset: options.offset,
      rawOnly: options.rawOnly,
      url: options.url,
    });
    const seen = ("offersSeen" in result ? result.offersSeen : 0) ?? 0;
    processed += seen;
    created += ("offersCreated" in result ? result.offersCreated : 0) ?? 0;
    updated += ("offersUpdated" in result ? result.offersUpdated : 0) ?? 0;
    skipped += ("offersSkipped" in result ? result.offersSkipped : 0) ?? 0;
    if (String("status" in result ? result.status : "") === "FAILED") failed += 1;
    console.log(result);
  }

  const progress = {
    checkpointId: id,
    processed,
    created: options.dryRun ? 0 : created,
    updated: options.dryRun ? 0 : updated,
    skipped,
    failed,
    nextOffset: options.offset + options.limit,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("ingest-all-full", progress);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
