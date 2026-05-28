/**
 * daily-refresh.ts
 *
 * Full pipeline refresh for all enabled shops:
 *   scrape → normalize-raw-offers → match-offers-to-variants
 *
 * Run manually:    npx tsx scripts/daily-refresh.ts
 * Run via cron:    npm run jobs:daily
 *
 * Env vars:
 *   SCRAPER_ENABLED=true       (set automatically)
 *   DAILY_SCRAPE_LIMIT=300     products scraped per shop (default 300)
 *   DAILY_SCRAPE_OFFSET=0      starting offset (default 0)
 *   DAILY_SHOPS=zoommer,ee,pcshop,alta  comma-separated (default: all enabled)
 */
import "./load-env";
import { spawnSync } from "child_process";
import { adapters } from "../src/server/scrapers/shops";
import { scrapeShop } from "../src/server/scrapers/runner";

process.env.SCRAPER_ENABLED = "true";

const LIMIT = Number.parseInt(process.env.DAILY_SCRAPE_LIMIT ?? "300", 10);
const OFFSET = Number.parseInt(process.env.DAILY_SCRAPE_OFFSET ?? "0", 10);
const SHOP_FILTER = process.env.DAILY_SHOPS?.split(",").map(s => s.trim());

function runScript(scriptPath: string, extraArgs: string[] = []) {
  const result = spawnSync("npx", ["tsx", scriptPath, ...extraArgs], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`Script failed: ${scriptPath} (exit ${result.status})`);
  }
}

async function scrapeAll() {
  const targets = adapters.filter(
    (a) => a.enabledByDefault && !a.needsConfiguration &&
      (!SHOP_FILTER || SHOP_FILTER.includes(a.slug)),
  );

  console.log(`\n[1/3] Scraping ${targets.length} shops (limit=${LIMIT} offset=${OFFSET})…`);

  for (const adapter of targets) {
    try {
      console.log(`  → ${adapter.slug}…`);
      const result = await scrapeShop(adapter.slug, { limit: LIMIT, offset: OFFSET, rawOnly: true });
      const seen = ("offersSeen" in result ? result.offersSeen : 0) ?? 0;
      const created = ("offersCreated" in result ? result.offersCreated : 0) ?? 0;
      const updated = ("offersUpdated" in result ? result.offersUpdated : 0) ?? 0;
      console.log(`     seen=${seen}  created=${created}  updated=${updated}`);
    } catch (err) {
      console.error(`  ✗ ${adapter.slug} scrape failed:`, (err as Error).message);
    }
  }
}

async function main() {
  const start = Date.now();
  console.log(`\n══════════════════════════════════════`);
  console.log(`  daily-refresh  ${new Date().toISOString()}`);
  console.log(`══════════════════════════════════════`);

  await scrapeAll();

  console.log("\n[2/3] Normalizing raw offers…");
  runScript("scripts/normalize-raw-offers.ts", [`--limit=2000`]);

  console.log("\n[3/3] Matching offers to variants…");
  runScript("scripts/match-offers-to-variants.ts", [`--limit=2000`]);

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\n✓ Daily refresh complete in ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
