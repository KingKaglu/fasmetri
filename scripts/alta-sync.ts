import "./load-env";
import { prisma } from "../src/lib/prisma";
import { runAltaSync, type AltaSyncMode } from "../src/server/alta/sync";

// Alta is read through its own public JSON API rather than the HTML scraper
// runner, but the same global kill switch applies.
async function main() {
  const args = parseArgs();

  if (process.env.SCRAPER_ENABLED !== "true") {
    console.error("SCRAPER_ENABLED must be 'true' to run the Alta sync.");
    process.exitCode = 1;
    return;
  }

  const result = await runAltaSync({
    mode: args.mode,
    promote: args.promote,
    limit: args.limit,
    categoryId: args.categoryId,
  });

  console.log("");
  console.log(`alta:${result.mode}`);
  console.log(`  categories       ${result.categories}`);
  console.log(`  rows from API    ${result.itemsFromApi}`);
  console.log(`  unique products  ${result.uniqueProducts}`);
  console.log(`  usable offers    ${result.usable}`);
  console.log(`  skipped          ${result.skipped}`);
  console.log(`  written          ${result.written}`);
  if (result.batchId) console.log(`  batch            ${result.batchId}`);
  if (!args.promote && args.mode !== "discover") {
    console.log("\n  (no --promote: nothing was written)");
  }
}

type CliArgs = {
  mode: AltaSyncMode;
  promote: boolean;
  limit?: number;
  categoryId?: number;
};

function parseArgs(): CliArgs {
  const args = new Map<string, string | boolean>();
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const [key, ...rest] = raw.slice(2).split("=");
    args.set(key, rest.length ? rest.join("=") : true);
  }
  const rawMode = args.get("mode");
  const mode: AltaSyncMode =
    rawMode === "full" || rawMode === "prices" || rawMode === "discover" ? rawMode : "discover";
  return {
    mode,
    promote: Boolean(args.get("promote")),
    limit: numberArg(args.get("limit")),
    categoryId: numberArg(args.get("category-id")),
  };
}

function numberArg(value: string | boolean | undefined) {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
