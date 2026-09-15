import "./load-env";
import { prisma } from "../src/lib/prisma";
import { buildSpecDescription, type NormalizedLaptopSpecs } from "../src/server/eeLaptops/sync";

// One-off repair. EE's listing payload has no description, so every EE laptop
// raw offer stored an empty one and RAM/storage never reached the matcher —
// which is why only 3 of 456 laptops compared across shops. The specs were
// already scraped into rawSpecsJson.normalizedSpecs, so this writes them down
// for the rows that already exist instead of waiting for a full re-scrape.
//
//   npx tsx scripts/backfill-ee-laptop-specs.ts --dry-run
//   npx tsx scripts/backfill-ee-laptop-specs.ts

const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const rows = await prisma.rawOffer.findMany({
    where: { categorySlug: "laptops", shop: { slug: "ee" } },
    select: { id: true, originalTitle: true, description: true, rawSpecsJson: true },
  });

  let written = 0;
  let skippedHasDescription = 0;
  let skippedNoSpecs = 0;
  const examples: string[] = [];

  for (const row of rows) {
    if (row.description && row.description.trim()) {
      skippedHasDescription += 1;
      continue;
    }
    const specs = (row.rawSpecsJson as { normalizedSpecs?: NormalizedLaptopSpecs } | null)?.normalizedSpecs;
    const description = specs ? buildSpecDescription(specs) : undefined;
    if (!description) {
      skippedNoSpecs += 1;
      continue;
    }
    if (examples.length < 5) examples.push(`${row.originalTitle.slice(0, 46)} -> ${description.slice(0, 70)}`);
    if (!dryRun) await prisma.rawOffer.update({ where: { id: row.id }, data: { description } });
    written += 1;
  }

  console.log(`ee laptop raw offers: ${rows.length}`);
  console.log(`${dryRun ? "would write" : "wrote"} description: ${written}`);
  console.log(`skipped (already had one): ${skippedHasDescription}`);
  console.log(`skipped (no usable specs): ${skippedNoSpecs}`);
  if (examples.length) console.log(`\nexamples:\n  ${examples.join("\n  ")}`);
  if (!dryRun && written) console.log("\nRe-run the laptop matcher to use them: npm run match:laptops -- --all");
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
