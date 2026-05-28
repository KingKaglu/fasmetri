import { getEnabledStores } from "../src/config/enabledStores";
import { findStoreAdapter } from "../src/server/stores";
import type { CategoryCoverageEntry, CategoryStatus } from "../src/server/stores/types";

const ALL_CATEGORIES = [
  "mobiles", "phone-accessories", "tablets", "tablet-accessories",
  "laptops", "computers", "computer-accessories", "cables-adapters", "monitors",
  "televisions", "audio", "wearables", "gaming", "photo-video",
  "refrigerators", "washing-machines", "home-appliances", "small-appliances",
  "kitchen-dishes", "furniture", "home-garden",
  "beauty", "sport", "kids", "pets", "auto-accessories", "books-stationery",
  "other", "adult",
] as const;

const STATUS_LABEL: Record<CategoryStatus, string> = {
  ready:               "ready              ",
  needs_configuration: "needs_config       ",
  unsupported:         "unsupported        ",
};

const STATUS_COUNTS: Record<CategoryStatus, number> = { ready: 0, needs_configuration: 0, unsupported: 0 };

function pad(s: string, len: number) {
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

function printRow(slug: string, entry: CategoryCoverageEntry | undefined) {
  const status = entry?.status ?? "needs_configuration";
  const url = entry?.url ? entry.url : "(URL needed)";
  const notes = entry?.notes ? `  — ${entry.notes}` : "";
  console.log(`    ${pad(slug, 26)} ${STATUS_LABEL[status]} ${url}${notes}`);
}

function sectionLine() {
  console.log("  " + "─".repeat(90));
}

function main() {
  const stores = getEnabledStores();

  console.log("\nFASMETRI STORE CATEGORY COVERAGE REPORT");
  console.log(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  console.log("═".repeat(94));

  const totals = { ...STATUS_COUNTS };
  const storesSummary: Array<{ name: string; ready: number; cfg: number; unsup: number }> = [];

  for (const storeConfig of stores) {
    const adapter = findStoreAdapter(storeConfig.key);
    const adapterStatus = adapter?.status ?? "needs_configuration";

    console.log(`\n${storeConfig.name.toUpperCase()}  ${storeConfig.baseUrl}  [${adapterStatus}]`);
    if (adapter?.rateLimitConfig) {
      console.log(`  Rate limit: ${adapter.rateLimitMs}ms delay · ${adapter.rateLimitConfig.requestsPerMinute} req/min`);
    }
    console.log(`\n  ${pad("Category", 26)} ${pad("Status", 21)} URL / Notes`);
    sectionLine();

    const categoryMap: Map<string, CategoryCoverageEntry> = new Map();
    if (adapter?.getStoreCategories) {
      for (const entry of adapter.getStoreCategories()) {
        categoryMap.set(entry.slug, entry);
      }
    }

    const counts = { ...STATUS_COUNTS };

    for (const slug of ALL_CATEGORIES) {
      const entry = categoryMap.get(slug);
      const status: CategoryStatus = entry?.status ?? "needs_configuration";
      counts[status]++;
      totals[status]++;
      printRow(slug, entry);
    }

    sectionLine();
    console.log(`  SUMMARY  ready: ${counts.ready}  |  needs_configuration: ${counts.needs_configuration}  |  unsupported: ${counts.unsupported}`);
    storesSummary.push({ name: storeConfig.name, ready: counts.ready, cfg: counts.needs_configuration, unsup: counts.unsupported });
  }

  console.log("\n" + "═".repeat(94));
  console.log("OVERALL SUMMARY");
  console.log(`  Stores: ${stores.length}  ·  Categories per store: ${ALL_CATEGORIES.length}  ·  Total slots: ${stores.length * ALL_CATEGORIES.length}`);
  console.log(`  ready: ${totals.ready}  |  needs_configuration: ${totals.needs_configuration}  |  unsupported: ${totals.unsupported}`);
  console.log();
  console.log(`  ${pad("Store", 22)} ${pad("ready", 8)} ${pad("needs_cfg", 12)} unsupported`);
  console.log("  " + "─".repeat(50));
  for (const s of storesSummary) {
    console.log(`  ${pad(s.name, 22)} ${pad(String(s.ready), 8)} ${pad(String(s.cfg), 12)} ${s.unsup}`);
  }
  console.log();
}

main();
