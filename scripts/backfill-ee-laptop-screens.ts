/**
 * Fills in screen size for EE laptops that were scraped before the sync could
 * read it from the title.
 *
 * Screen size decides whether two otherwise identical laptops are the same
 * machine — an Air 13 and an Air 15 share brand, chip, RAM and storage — and EE
 * publishes the spec on well under half its catalogue. The matcher reads the
 * stored identity before re-extracting, so fixing the sync changes nothing for
 * rows already in the table.
 *
 * Only empty fields are filled. An existing spec always wins: it holds the
 * exact panel size (15.6") while a title holds the rounded marketing one
 * ("15"), and overwriting the precise value with the rounded one would lose
 * information for no gain.
 *
 *   npx tsx scripts/backfill-ee-laptop-screens.ts --dry-run
 *   npx tsx scripts/backfill-ee-laptop-screens.ts
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";
import { extractScreenSizeFromTitle } from "../src/lib/screenSize";

const dryRun = process.argv.includes("--dry-run");

type Identity = Record<string, unknown> & { specs?: Record<string, unknown> };

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const rows = await prisma.rawOffer.findMany({
    where: { categorySlug: "laptops", shop: { slug: "ee" } },
    select: { id: true, originalTitle: true, productIdentity: true },
  });

  let filled = 0;
  let alreadyHad = 0;
  let noneFound = 0;
  const examples: string[] = [];

  for (const row of rows) {
    const identity = (row.productIdentity ?? null) as Identity | null;
    if (!identity) continue;
    const specs = (identity.specs ?? {}) as Record<string, unknown>;
    if (identity.screenSize ?? specs.screenSize) { alreadyHad += 1; continue; }

    const parsed = extractScreenSizeFromTitle(row.originalTitle);
    if (!parsed) { noneFound += 1; continue; }

    filled += 1;
    if (examples.length < 10) examples.push(`  ${parsed}"  ${row.originalTitle.slice(0, 58)}`);
    if (dryRun) continue;

    const value = `${parsed} Inch`;
    await prisma.rawOffer.update({
      where: { id: row.id },
      data: {
        productIdentity: {
          ...identity,
          screenSize: value,
          specs: { ...specs, screenSize: value },
        } as unknown as object,
      },
    });
  }

  console.log(`EE laptop offers scanned: ${rows.length}`);
  console.log(`  already had a screen size: ${alreadyHad}`);
  console.log(`  ${dryRun ? "would fill" : "filled"} from title:      ${filled}`);
  console.log(`  no size in the title:      ${noneFound}`);
  if (examples.length) console.log("examples:\n" + examples.join("\n"));
  if (!dryRun && filled) console.log("\nRe-run the laptop matcher: npm run match:laptops -- --all");
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
