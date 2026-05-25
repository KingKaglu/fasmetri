import { ScrapeStatus } from "@prisma/client";
import { adapters } from "@/server/scrapers/shops";
import { scrapeShop, ScrapeBatchOptions } from "@/server/scrapers/runner";

export type ScheduledScrapeOptions = ScrapeBatchOptions & {
  concurrency?: number;
  shop?: string;
};

export type ScheduledScrapeResult = {
  success: number;
  errors: number;
  total: number;
  stores: Array<{
    shop: string;
    status: string;
    pagesVisited: number;
    offersSeen: number;
    offersCreated: number;
    offersUpdated: number;
    offersSkipped: number;
    errors?: unknown;
  }>;
};

export async function runScheduledScrape(options: ScheduledScrapeOptions = {}): Promise<ScheduledScrapeResult> {
  const concurrency = clampConcurrency(options.concurrency);
  const targets = adapters.filter((adapter) => {
    if (options.shop && adapter.slug !== options.shop) return false;
    return adapter.enabledByDefault && !adapter.needsConfiguration;
  });

  const stores: ScheduledScrapeResult["stores"] = [];
  const queue = [...targets];

  async function worker() {
    while (queue.length) {
      const adapter = queue.shift();
      if (!adapter) return;

      try {
        const run = await scrapeShop(adapter.slug, {
          category: options.category,
          dryRun: options.dryRun,
          importBatchId: options.importBatchId,
          limit: options.limit,
          offset: options.offset,
          rawOnly: options.rawOnly,
          url: options.url,
        });
        stores.push(normalizeRun(adapter.slug, run));
      } catch (error) {
        stores.push({
          shop: adapter.slug,
          status: "FAILED",
          pagesVisited: 0,
          offersSeen: 0,
          offersCreated: 0,
          offersUpdated: 0,
          offersSkipped: 0,
          errors: error instanceof Error ? error.message : error,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(queue.length, 1)) }, () => worker()));

  const success = stores.filter((store) => store.status === ScrapeStatus.SUCCESS || store.status === ScrapeStatus.PARTIAL).length;
  const errors = stores.filter((store) => store.status === "FAILED").length;

  return { success, errors, total: stores.length, stores };
}

function normalizeRun(shop: string, run: unknown): ScheduledScrapeResult["stores"][number] {
  const value = (run ?? {}) as Record<string, unknown>;
  return {
    shop,
    status: String(value.status ?? "UNKNOWN"),
    pagesVisited: numberValue(value.pagesVisited),
    offersSeen: numberValue(value.offersSeen),
    offersCreated: numberValue(value.offersCreated),
    offersUpdated: numberValue(value.offersUpdated),
    offersSkipped: numberValue(value.offersSkipped),
    errors: value.errorLog,
  };
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampConcurrency(value?: number) {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.floor(value), 1), 3);
}
