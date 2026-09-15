import "./load-env";
import { prisma } from "../src/lib/prisma";
import { buildSpecDescription, type NormalizedLaptopSpecs } from "../src/server/eeLaptops/sync";
import { extractProductIdentity } from "../src/lib/productIdentity";

// One-off repair. EE's listing payload has no description, so every EE laptop
// raw offer stored an empty one and RAM/storage never reached the matcher —
// which is why only 3 of 456 laptops compared across shops. The specs were
// already scraped into rawSpecsJson.normalizedSpecs, so this writes them down
// for the rows that already exist instead of waiting for a full re-scrape.
//
// productIdentity is rewritten too, and that part is essential: cross-store
// discovery reads the STORED identity first (productVerification.ts
// decisionForCandidate) and only falls back to extracting one. Leaving a
// spec-less identity in place would keep every EE laptop unmatchable no matter
// what the description says. Idempotent — safe to re-run.
//
//   npx tsx scripts/backfill-ee-laptop-specs.ts --dry-run
//   npx tsx scripts/backfill-ee-laptop-specs.ts

const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const rows = await prisma.rawOffer.findMany({
    where: { categorySlug: "laptops", shop: { slug: "ee" } },
    select: { id: true, originalTitle: true, description: true, brand: true, rawSpecsJson: true },
  });

  let written = 0;
  let skippedHasDescription = 0;
  let skippedNoSpecs = 0;
  const examples: string[] = [];

  for (const row of rows) {
    const specs = (row.rawSpecsJson as { normalizedSpecs?: NormalizedLaptopSpecs } | null)?.normalizedSpecs;
    const description = specs ? buildSpecDescription(specs) : undefined;
    if (!description) {
      if (row.description?.trim()) skippedHasDescription += 1;
      else skippedNoSpecs += 1;
      continue;
    }
    const identity = extractProductIdentity({
      title: row.originalTitle,
      description,
      brand: row.brand,
      categorySlug: "laptops",
    });
    if (examples.length < 5) examples.push(`${row.originalTitle.slice(0, 44)} -> ${description.slice(0, 64)}`);
    if (!dryRun) {
      await prisma.rawOffer.update({
        where: { id: row.id },
        data: { description, productIdentity: identity as unknown as object },
      });
    }
    written += 1;
  }

  console.log(`ee laptop raw offers: ${rows.length}`);
  console.log(`${dryRun ? "would write" : "wrote"} description: ${written}`);
  console.log(`skipped (kept existing description): ${skippedHasDescription}`);
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
