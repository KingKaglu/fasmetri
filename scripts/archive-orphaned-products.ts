// Archive catalogue rows that a rematch left behind.
//
// When the matcher's identity rules change, an offer's canonicalKey changes
// with them: the offer moves to a new CanonicalProduct, and the row it came
// from is left holding nothing. The legacy Product built from that row is left
// empty too. Neither is reachable from a listing -- listProducts requires
// `offers: { some: … }` -- but the Product keeps a resolvable
// /products/<slug> URL, so the site accumulates thin, empty pages.
//
// This sweep is the cleanup half of a rematch. It is safe to run at any time
// and safe to run twice.
//
//   Products with no offers        -> archivedAt = now, isPublic = false
//   CanonicalProducts with no offers -> deleted
//
// Archiving a Product is reversible and self-healing: ensureLegacyProduct in
// match-products.ts writes `archivedAt: null` every time it touches a product,
// so one that gets offers again comes straight back.
//
// Deleting an empty CanonicalProduct cascades to its PossibleMatch rows, which
// is the point -- a review-queue row pointing at a product with no offers can
// never be actioned into anything. ProductOffer.canonicalProductId is SetNull,
// and by definition these rows have no offers pointing at them.
//
// Dry-run by default, per the catalogue rules in CLAUDE.md. Pass --apply to
// write.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type Options = { apply: boolean; limit: number };

function readOptions(): Options {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const limit = Number(limitArg ?? 500);
  return {
    apply: process.argv.includes("--apply"),
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 500,
  };
}

async function main() {
  const db = prisma!;
  const options = readOptions();
  if (!options.apply) {
    console.log("archive-orphaned-products: dry-run (pass --apply to write changes)");
  }

  // Counted separately from the page below: the operator needs the true scale
  // to decide, not just however many this run happens to take.
  const [totalOrphanProducts, totalOrphanCanonicals] = await Promise.all([
    db.product.count({ where: { offers: { none: {} }, archivedAt: null } }),
    db.canonicalProduct.count({ where: { offers: { none: {} } } }),
  ]);

  // ── Empty legacy products ────────────────────────────────────────────────
  const orphanProducts = await db.product.findMany({
    where: { offers: { none: {} }, archivedAt: null },
    select: { id: true, name: true, slug: true, category: { select: { slug: true } } },
    orderBy: { updatedAt: "asc" },
    take: options.limit,
  });

  console.log(`\nProducts with no offers: ${totalOrphanProducts} (this run takes ${orphanProducts.length})`);
  for (const product of orphanProducts.slice(0, 10)) {
    console.log(`    [${product.category?.slug ?? "no category"}] /products/${product.slug} — ${product.name}`);
  }
  if (orphanProducts.length > 10) console.log(`    …and ${orphanProducts.length - 10} more`);

  if (options.apply && orphanProducts.length) {
    const archived = await db.product.updateMany({
      where: { id: { in: orphanProducts.map((product) => product.id) } },
      data: { archivedAt: new Date(), isPublic: false },
    });
    console.log(`    archived ${archived.count}`);
  }

  // ── Empty canonical products ─────────────────────────────────────────────
  const orphanCanonicals = await db.canonicalProduct.findMany({
    where: { offers: { none: {} } },
    select: {
      id: true,
      title: true,
      canonicalKey: true,
      matcherVersion: true,
      _count: { select: { possibleMatches: true } },
    },
    orderBy: { updatedAt: "asc" },
    take: options.limit,
  });

  const cascadedMatches = orphanCanonicals.reduce((total, canonical) => total + canonical._count.possibleMatches, 0);
  console.log(
    `\nCanonical products with no offers: ${totalOrphanCanonicals} (this run takes ${orphanCanonicals.length}, ` +
      `whose deletion also removes ${cascadedMatches} review-queue rows pointing at them)`,
  );
  for (const canonical of orphanCanonicals.slice(0, 10)) {
    console.log(`    ${canonical.matcherVersion}  ${canonical.canonicalKey} — ${canonical.title}`);
  }
  if (orphanCanonicals.length > 10) console.log(`    …and ${orphanCanonicals.length - 10} more`);

  if (options.apply && orphanCanonicals.length) {
    const deleted = await db.canonicalProduct.deleteMany({
      where: { id: { in: orphanCanonicals.map((canonical) => canonical.id) } },
    });
    console.log(`    deleted ${deleted.count}`);
  }

  const remainingProducts = totalOrphanProducts - orphanProducts.length;
  const remainingCanonicals = totalOrphanCanonicals - orphanCanonicals.length;
  console.log(
    `\narchive-orphaned-products: ${options.apply ? "applied" : "dry-run"} — ` +
      `${orphanProducts.length}/${totalOrphanProducts} products, ` +
      `${orphanCanonicals.length}/${totalOrphanCanonicals} canonical products.`,
  );
  if (remainingProducts > 0 || remainingCanonicals > 0) {
    console.log(`Run again to take the remaining ${remainingProducts} products and ${remainingCanonicals} canonical products.`);
  }
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
