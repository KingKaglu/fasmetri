import "./load-env";
import cron from "node-cron";
import { adapters } from "../src/server/scrapers/shops";
import { scrapeShop } from "../src/server/scrapers/runner";
import { prepareTriggeredAlerts } from "../src/server/alerts/evaluate";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

const schedule = process.env.PRICE_JOB_CRON ?? "*/30 * * * *";
const batchOptions = parseBatchOptions("jobs-prices", { limit: 200 });
const shopsPerTick = Math.min(Math.max(Number.parseInt(process.env.PRICE_JOB_SHOPS_PER_TICK ?? "1", 10) || 1, 1), 3);
const enabledAdapters = adapters.filter((adapter) => !batchOptions.shop || adapter.slug === batchOptions.shop);
const offsetsByShop = new Map(enabledAdapters.map((adapter) => [adapter.slug, batchOptions.offset]));
let shopCursor = 0;
let refreshRunning = false;

cron.schedule(schedule, async () => {
  if (refreshRunning) {
    console.warn("Skipping price refresh because the previous run is still active.");
    return;
  }
  refreshRunning = true;
  const selectedAdapters = nextAdapters();
  for (const adapter of selectedAdapters) {
    const offset = offsetsByShop.get(adapter.slug) ?? 0;
    try {
      const run = await scrapeShop(adapter.slug, {
        category: batchOptions.category,
        dryRun: batchOptions.dryRun,
        limit: batchOptions.limit,
        offset,
      });
      const offersSeen = ("offersSeen" in run ? run.offersSeen : 0) ?? 0;
      const offersCreated = ("offersCreated" in run ? run.offersCreated : 0) ?? 0;
      const offersUpdated = ("offersUpdated" in run ? run.offersUpdated : 0) ?? 0;
      const offersSkipped = ("offersSkipped" in run ? run.offersSkipped : 0) ?? 0;
      const nextOffset = offset + batchOptions.limit;
      offsetsByShop.set(adapter.slug, nextOffset);
      const progress = {
        checkpointId: checkpointId("jobs-prices", { ...batchOptions, shop: adapter.slug }),
        created: batchOptions.dryRun ? 0 : offersCreated,
        updated: batchOptions.dryRun ? 0 : offersUpdated,
        skipped: offersSkipped,
        failed: "status" in run && String(run.status) === "FAILED" ? 1 : 0,
        processed: offersSeen,
        nextOffset,
      };
      if (!batchOptions.dryRun) writeCheckpoint(`${batchOptions.checkpoint}.${adapter.slug}.json`, progress);
      logProgress("jobs-prices", progress);
    } catch (error) {
      console.error(`Scheduled scrape failed for ${adapter.slug}`, error);
    }
  }
  try {
    await prepareTriggeredAlerts();
  } finally {
    refreshRunning = false;
  }
});

function nextAdapters() {
  if (!enabledAdapters.length) return [];
  const selected = [];
  for (let count = 0; count < Math.min(shopsPerTick, enabledAdapters.length); count += 1) {
    selected.push(enabledAdapters[(shopCursor + count) % enabledAdapters.length]);
  }
  shopCursor = (shopCursor + selected.length) % enabledAdapters.length;
  return selected;
}

console.log(`Price job scheduled: ${schedule}; batch limit=${batchOptions.limit}; shops per tick=${shopsPerTick}.`);
