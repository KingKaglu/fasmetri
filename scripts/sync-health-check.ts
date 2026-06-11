import "./load-env";
import { appendFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

// Daily sync health monitor (sync-health-monitor.yml). Reads the latest
// SyncLog per store/category and flags any module without a successful sync
// in the last STALE_HOURS. Exits 1 when something is unhealthy so the
// GitHub Action shows red.

const STALE_HOURS = 28;

const MODULES: Array<{ store: string; category: string }> = [
  { store: "zoommer", category: "phones" },
  { store: "zoommer", category: "laptops" },
  { store: "ee", category: "phones" },
  { store: "ee", category: "laptops" },
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

main()
  .catch((error) => {
    console.error("[health] Sync health check failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
