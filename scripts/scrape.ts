import "./load-env";
import { adapters } from "../src/server/scrapers/shops";
import { scrapeShop } from "../src/server/scrapers/runner";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

async function main() {
  const args = process.argv.slice(2);
  const options = parseBatchOptions("scrape", { limit: 200 });
  const id = checkpointId("scrape", options);
  const forceLive = args.includes("--live");
  if (forceLive) process.env.SCRAPER_ENABLED = "true";

  const positionalSlug = args.find((value) => !value.startsWith("--"));
  const slug = options.shop ?? positionalSlug;
  if (!slug || slug === "all") {
    throw new Error("Batch scraping requires one shop. Use --shop=zoommer (or npm run ingest:zoommer -- --limit=200 --offset=0).");
  }
  const targets = adapters.filter((adapter) => adapter.slug === slug);
  if (!targets.length) throw new Error(`Unknown adapter: ${slug}`);

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const adapter of targets) {
    console.log(`Scraping ${adapter.slug} offset=${options.offset} limit=${options.limit}${options.dryRun ? " dry-run" : ""}${options.rawOnly ? " raw-only" : ""}...`);
    const run = await scrapeShop(adapter.slug, {
      category: options.category,
      dryRun: options.dryRun,
      importBatchId: id,
      limit: options.limit,
      offset: options.offset,
      rawOnly: options.rawOnly,
      url: options.url,
    });
    const offersSeen = ("offersSeen" in run ? run.offersSeen : 0) ?? 0;
    const offersCreated = ("offersCreated" in run ? run.offersCreated : 0) ?? 0;
    const offersUpdated = ("offersUpdated" in run ? run.offersUpdated : 0) ?? 0;
    const offersSkipped = ("offersSkipped" in run ? run.offersSkipped : 0) ?? 0;
    const status = "status" in run ? String(run.status) : "UNKNOWN";
    processed += offersSeen;
    created += offersCreated;
    updated += offersUpdated;
    skipped += offersSkipped;
    if (status === "FAILED") failed += 1;
    console.log(run);
  }

  const progress = {
    checkpointId: id,
    created: options.dryRun ? 0 : created,
    updated: options.dryRun ? 0 : updated,
    skipped,
    failed,
    processed,
    nextOffset: options.offset + options.limit,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("scrape", progress);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
