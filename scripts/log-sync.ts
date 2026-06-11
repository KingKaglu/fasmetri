import "./load-env";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";

// Writes one SyncLog row per sync workflow run. Called as the final step of
// each sync workflow with the step outcome:
//   npx tsx scripts/log-sync.ts --store=zoommer --category=phones --run-type=prices --status=success
//
// Counts are read from the local report the sync just wrote
// (reports/{store}-{category}-sync-latest.json). The script never exits
// non-zero: a logging failure must not turn a green sync run red (that would
// also suppress the chained matcher workflow).

type SyncReport = {
  startedAt?: string;
  finishedAt?: string;
  mode?: string;
  importedCount?: number;
  discoveredCount?: number;
  updatedCount?: number;
  failedCount?: number;
  promotionResult?: string;
  validation?: { hardFailures?: string[] };
};

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

// Only trust the report if the sync that just ran actually wrote it; a stale
// report from a previous run must not lend its counts to a failed run.
function readFreshReport(moduleKey: string, maxAgeMs: number): SyncReport | null {
  try {
    const path = join(process.cwd(), "reports", `${moduleKey}-sync-latest.json`);
    if (!existsSync(path)) return null;
    const report = JSON.parse(readFileSync(path, "utf8")) as SyncReport;
    if (!report.finishedAt) return null;
    const age = Date.now() - new Date(report.finishedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return null;
    return report;
  } catch {
    return null;
  }
}

async function main() {
  const store = readArg("store");
  const category = readArg("category");
  const runType = readArg("run-type") ?? "prices";
  const cliStatus = readArg("status") ?? "failure";

  if (!store || !category) {
    console.error("[log-sync] --store and --category are required.");
    return;
  }
  if (!prisma) {
    console.error("[log-sync] DATABASE_URL is not set; skipping SyncLog write.");
    return;
  }

  const now = new Date();
  const report = readFreshReport(`${store}-${category}`, 6 * 60 * 60 * 1000);

  let status = cliStatus === "success" ? "success" : "failure";
  if (status === "success" && report && (report.failedCount ?? 0) > 0) {
    status = "partial";
  }

  const hardFailures = report?.validation?.hardFailures ?? [];
  const errorMessage =
    status === "success"
      ? null
      : hardFailures.length
        ? hardFailures.join("; ").slice(0, 1000)
        : status === "partial"
          ? `${report?.failedCount ?? 0} detail fetches failed`
          : "Sync step failed (see GitHub Actions logs).";

  const entry = await prisma.syncLog.create({
    data: {
      store,
      category,
      runType,
      status,
      offersScraped: report?.importedCount ?? report?.discoveredCount ?? 0,
      offersUpdated: report?.updatedCount ?? 0,
      errorMessage,
      startedAt: report?.startedAt ? new Date(report.startedAt) : now,
      completedAt: report?.finishedAt ? new Date(report.finishedAt) : now,
    },
  });

  console.log(
    `[log-sync] Logged ${store}/${category} ${runType} → ${status}` +
      ` (scraped=${entry.offersScraped}, updated=${entry.offersUpdated}, id=${entry.id})`,
  );
}

main()
  .catch((error) => {
    console.error("[log-sync] Failed to write SyncLog entry:", error);
  })
  .finally(() => prisma?.$disconnect());
