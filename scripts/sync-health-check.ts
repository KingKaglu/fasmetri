import "./load-env";
import { appendFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

// Daily sync health monitor (sync-health-monitor.yml). Two independent checks:
//
//   1. Freshness — the latest SyncLog per store/category, flagging any module
//      without a successful sync in the last STALE_HOURS.
//   2. Stock resolution — a sync can report success while leaving stock frozen,
//      which is how Zoommer once sat at 571 offers of unresolved availability
//      and read as sold out across the public catalogue. A green run log is
//      therefore not evidence that the data is usable.
//
// Exits 1 when something is unhealthy so the GitHub Action shows red.

const STALE_HOURS = 28;
// Above this share of unresolved stock a shop is effectively invisible in the
// catalogue, because the public filters only ever count IN_STOCK.
const MAX_UNKNOWN_STOCK_RATIO = 0.1;

const MODULES: Array<{ store: string; category: string }> = [
  { store: "zoommer", category: "phones" },
  { store: "zoommer", category: "laptops" },
  { store: "ee", category: "phones" },
  { store: "ee", category: "laptops" },
  { store: "pcshop", category: "phones" },
  { store: "pcshop", category: "laptops" },
  { store: "pcshop", category: "consoles" },
  { store: "zoommer", category: "consoles" },
  { store: "ee", category: "consoles" },
];

function hoursAgo(date: Date): number {
  return Math.round(((Date.now() - date.getTime()) / 3_600_000) * 10) / 10;
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const lines: string[] = [];
  let unhealthy = 0;

  for (const { store, category } of MODULES) {
    const where = { store, category };
    const [lastSuccess, lastRun] = await Promise.all([
      prisma.syncLog.findFirst({ where: { ...where, status: { in: ["success", "partial"] } }, orderBy: { completedAt: "desc" } }),
      prisma.syncLog.findFirst({ where, orderBy: { completedAt: "desc" } }),
    ]);

    const name = `${store}/${category}`;
    if (!lastSuccess) {
      unhealthy += 1;
      lines.push(`| ${name} | 🔴 never succeeded | — | ${lastRun ? `${lastRun.status} ${hoursAgo(lastRun.completedAt)}h ago` : "no runs logged"} |`);
      console.error(`[health] ${name}: NO successful sync logged${lastRun ? ` (last run: ${lastRun.status})` : ""}`);
      continue;
    }

    const age = hoursAgo(lastSuccess.completedAt);
    const stale = age > STALE_HOURS;
    if (stale) unhealthy += 1;

    const lastRunNote = lastRun && lastRun.id !== lastSuccess.id ? `${lastRun.status} ${hoursAgo(lastRun.completedAt)}h ago` : "—";
    lines.push(`| ${name} | ${stale ? "🔴 stale" : "🟢 healthy"} | ${age}h ago (${lastSuccess.runType}, ${lastSuccess.offersScraped} scraped) | ${lastRunNote} |`);

    const logFn = stale ? console.error : console.log;
    logFn(
      `[health] ${name}: last success ${age}h ago (${lastSuccess.status}, ${lastSuccess.runType},` +
        ` scraped=${lastSuccess.offersScraped}, updated=${lastSuccess.offersUpdated})${stale ? ` — STALE (>${STALE_HOURS}h)` : ""}`,
    );
    if (lastRun && lastRun.status === "failure" && lastRun.errorMessage) {
      console.error(`[health] ${name}: latest run failed: ${lastRun.errorMessage}`);
    }
  }

  const stock = await checkStockResolution();
  unhealthy += stock.unhealthy;

  const summary = [
    `## Sync health (${new Date().toISOString()})`,
    "",
    "| Module | Status | Last success | Latest non-success run |",
    "|---|---|---|---|",
    ...lines,
    "",
    unhealthy ? `**${unhealthy} module(s) without a successful sync in ${STALE_HOURS}h.**` : `All modules synced within ${STALE_HOURS}h. ✅`,
  ].join("\n");

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  console.log(`\n${summary}`);

  if (unhealthy > 0) process.exitCode = 1;
}

/**
 * Every active offer should carry a resolved IN_STOCK / OUT_OF_STOCK. UNKNOWN
 * means no scrape ever established stock for it, and the public catalogue reads
 * that as "not available" — so a shop full of UNKNOWN silently disappears from
 * comparisons while its sync keeps reporting success.
 */
async function checkStockResolution() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const lines: string[] = [];
  let unhealthy = 0;

  const shops = await prisma.shop.findMany({ where: { enabled: true }, select: { id: true, slug: true }, orderBy: { slug: "asc" } });
  for (const shop of shops) {
    const [active, unresolved] = await Promise.all([
      prisma.productOffer.count({ where: { shopId: shop.id, isActive: true } }),
      prisma.productOffer.count({ where: { shopId: shop.id, isActive: true, availability: "UNKNOWN" } }),
    ]);
    if (active === 0) {
      lines.push(`| ${shop.slug} | ⚪ no active offers | 0 | — |`);
      continue;
    }

    const ratio = unresolved / active;
    const bad = ratio > MAX_UNKNOWN_STOCK_RATIO;
    if (bad) unhealthy += 1;
    lines.push(`| ${shop.slug} | ${bad ? "🔴 unresolved" : "🟢 resolved"} | ${active} | ${unresolved} (${Math.round(ratio * 100)}%) |`);

    const logFn = bad ? console.error : console.log;
    logFn(
      `[health] ${shop.slug}: ${unresolved}/${active} active offers have unresolved stock (${Math.round(ratio * 100)}%)` +
        `${bad ? ` — over the ${Math.round(MAX_UNKNOWN_STOCK_RATIO * 100)}% limit; those offers read as sold out on the site` : ""}`,
    );
  }

  return { lines, unhealthy };
}

main()
  .catch((error) => {
    console.error("[health] Sync health check failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
