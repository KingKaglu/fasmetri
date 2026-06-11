import "./load-env";
import { appendFileSync } from "node:fs";
import { autoTriagePendingMatches } from "../src/lib/admin-matching";
import { prisma } from "../src/lib/prisma";

// CLI for the review-queue auto-triage (review-queue-triage.yml runs this
// daily). Same logic as POST /api/admin/review/auto-triage but talks to the
// DB directly, like every other CI job in this repo.
//
//   npx tsx scripts/auto-triage-review.ts [--dry-run] [--limit=500]

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : undefined;

  const result = await autoTriagePendingMatches({ dryRun, limit });

  console.log(
    `[auto-triage]${dryRun ? " (dry-run)" : ""} scanned=${result.scanned}` +
      ` approved=${result.approved} rejected=${result.rejected} kept=${result.kept} failed=${result.failed}`,
  );
  for (const decision of result.decisions) {
    if (decision.action === "kept") continue;
    console.log(`  ${decision.action.toUpperCase()} [${decision.storedConfidence}→${decision.confidence}] "${decision.rawTitle}" ↔ "${decision.candidateTitle}" — ${decision.reason}`);
  }
  for (const failure of result.failures) console.error(`  FAILED ${failure}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        `## Review queue auto-triage${dryRun ? " (dry-run)" : ""}`,
        "",
        `| Scanned | Approved | Rejected | Kept pending | Failed |`,
        `|---|---|---|---|---|`,
        `| ${result.scanned} | ${result.approved} | ${result.rejected} | ${result.kept} | ${result.failed} |`,
        "",
      ].join("\n"),
    );
  }

  if (result.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("[auto-triage] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
