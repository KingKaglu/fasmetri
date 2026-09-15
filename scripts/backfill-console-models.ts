/**
 * Recomputes the model on gaming offers that were scraped before
 * src/lib/consoleModel.ts existed.
 *
 * Those rows carry the old chain's answer — every PS5 accessory stamped with
 * model "PlayStation 5" — and the matcher reads the STORED identity before it
 * re-extracts anything, so fixing the syncs alone changes nothing until the
 * next full re-scrape. This rewrites the stored answer in place.
 *
 * An accessory the extractor cannot name resolves to no model at all, and
 * that null is written through deliberately: an empty model keeps the item out
 * of every console's offer group, which is the whole point of the fix.
 *
 *   npx tsx scripts/backfill-console-models.ts --dry-run
 *   npx tsx scripts/backfill-console-models.ts
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";
import { extractConsoleModel } from "../src/lib/consoleModel";

const dryRun = process.argv.includes("--dry-run");

type Identity = Record<string, unknown> & { specs?: Record<string, unknown> };

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const rows = await prisma.rawOffer.findMany({
    where: { categorySlug: "gaming" },
    select: { id: true, originalTitle: true, model: true, productIdentity: true },
  });

  let changed = 0;
  let cleared = 0;
  const examples: string[] = [];

  for (const row of rows) {
    const next = extractConsoleModel(row.originalTitle);
    const identity = (row.productIdentity ?? null) as Identity | null;
    const current = (identity?.model as string | undefined) ?? row.model ?? undefined;
    if ((current ?? undefined) === (next ?? undefined)) continue;

    changed += 1;
    if (!next) cleared += 1;
    if (examples.length < 12) {
      examples.push(`  ${row.originalTitle.slice(0, 56).padEnd(58)} ${String(current)} -> ${String(next)}`);
    }
    if (dryRun) continue;

    const nextIdentity: Identity | null = identity
      ? { ...identity, model: next ?? null, specs: identity.specs ? { ...identity.specs, model: next ?? null } : identity.specs }
      : null;

    await prisma.rawOffer.update({
      where: { id: row.id },
      data: {
        model: next ?? null,
        ...(nextIdentity ? { productIdentity: nextIdentity as unknown as object } : {}),
      },
    });
  }

  console.log(`gaming offers scanned: ${rows.length}`);
  console.log(`${dryRun ? "would change" : "changed"}: ${changed} (of which model cleared: ${cleared})`);
  if (examples.length) console.log("examples:\n" + examples.join("\n"));
  if (!dryRun && changed) console.log("\nRe-run the console matcher: npm run match:consoles -- --all");
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
