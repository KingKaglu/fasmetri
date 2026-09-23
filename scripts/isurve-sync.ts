import "./load-env";
import { findStoreConfig } from "../src/config/enabledStores";
import { prisma } from "../src/lib/prisma";
import { runIsurveSync, type IsurveSyncMode } from "../src/server/isurve/sync";

// iSurve is a Shopify storefront read through its own public JSON endpoints
// rather than the HTML scraper runner, but the same global kill switch applies.
//
//   --mode=discover   list the in-scope collections only, no product fetch
//   --mode=full       fetch every in-scope collection (dry run without --promote)
//   --mode=prices     same fetch, used by the recurring price refresh
//   --promote         the ONLY flag that writes to the database
//
// The per-store switch in src/config/enabledStores.ts is enforced HERE: nothing
// else on this path reads STORE_CONFIGS (runIsurveSync creates the Shop row with
// enabled:true itself), and package.json ships `scrape:isurve:full` with
// --promote baked in, so without this check a single npm run would write to
// production while the store is still marked disabled.
async function main() {
  const args = parseArgs();

  if (process.env.SCRAPER_ENABLED !== "true") {
    console.error("SCRAPER_ENABLED must be 'true' to run the iSurve sync.");
    process.exitCode = 1;
    return;
  }

  const storeConfig = findStoreConfig("isurve");
  if (args.promote && !storeConfig?.enabled) {
    console.error(
      "iSurve is disabled in src/config/enabledStores.ts — refusing --promote. Run the dry run (drop --promote) or flip `enabled: true` deliberately.",
    );
    process.exitCode = 1;
    return;
  }

  const result = await runIsurveSync({
    mode: args.mode,
    promote: args.promote,
    limit: args.limit,
    collection: args.collection,
  });

  console.log("");
  console.log(`isurve:${result.mode}`);
  console.log(`  collections in scope  ${result.collectionsInScope}`);
  console.log(`  collections walked    ${result.collectionsSeen}`);
  console.log(`  collections rejected  ${result.collectionsRejected}`);
  if (result.incompleteCollections.length) {
    console.log(`  INCOMPLETE            ${result.incompleteCollections.length} (promotion is blocked)`);
    for (const problem of result.incompleteCollections) console.log(`    ${problem}`);
  }
  console.log(`  rows from API         ${result.itemsFromApi}`);
  console.log(`  unique products       ${result.uniqueProducts}`);
  console.log(`  usable offers         ${result.usable}`);
  console.log(`  skipped               ${result.skipped}`);
  console.log(`  written               ${result.written}`);
  if (result.batchId) console.log(`  batch                 ${result.batchId}`);
  const categories = Object.entries(result.byCategory).sort((left, right) => right[1] - left[1]);
  if (categories.length) {
    console.log("  by category");
    for (const [slug, count] of categories) console.log(`    ${slug.padEnd(22)} ${count}`);
  }
  if (result.samples.length) {
    console.log("  sample offers");
    for (const offer of result.samples) {
      console.log(
        `    ${offer.categorySlug} | ${offer.brand ?? "-"} | ${offer.model ?? "-"} | ${offer.price}${offer.oldPrice ? ` (was ${offer.oldPrice})` : ""} | ${offer.availability} | ${offer.title}`,
      );
    }
  }
  if (!args.promote && args.mode !== "discover") {
    console.log("\n  (no --promote: nothing was written)");
  }
}

type CliArgs = {
  mode: IsurveSyncMode;
  promote: boolean;
  limit?: number;
  collection?: string;
};

function parseArgs(): CliArgs {
  const args = new Map<string, string | boolean>();
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const [key, ...rest] = raw.slice(2).split("=");
    args.set(key, rest.length ? rest.join("=") : true);
  }
  const rawMode = args.get("mode");
  const mode: IsurveSyncMode =
    rawMode === "full" || rawMode === "prices" || rawMode === "discover" ? rawMode : "discover";
  const collection = args.get("collection");
  return {
    mode,
    // --dry-run is accepted as an explicit opposite of --promote so the command
    // reads the same way as import-store.ts; nothing is written without
    // --promote either way.
    promote: Boolean(args.get("promote")) && !args.get("dry-run"),
    limit: numberArg(args.get("limit")),
    collection: typeof collection === "string" ? collection : undefined,
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
