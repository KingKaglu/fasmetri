/**
 * Merges laptop products whose offers carry an IDENTICAL manufacturer part
 * number in different shops.
 *
 *   Elite Electronics  ASUS TUF Gaming 16/FA608PM-RV041 Gray    4849.99
 *   Zoommer            Asus TUF A16 FA608PM-RV041, AMD Ryzen... 4399.00
 *
 * Those are one machine and a 451 GEL gap, sitting on two separate pages.
 *
 * safeProductMatcher now reads the part number and links these at the
 * canonical layer, but the public catalogue groups by Product, and the two are
 * bridged by a separate verification job — so the canonical link alone changes
 * nothing a visitor can see. This closes that gap directly for the one case
 * where certainty is total: the manufacturer's own identifier, suffix
 * included, appearing in more than one shop.
 *
 * Deliberately narrow. It merges only on an exact full SKU, never a base code
 * (E1504FA-BQ521 and E1504FA-BQ2965 are different configurations), and it
 * refuses any group whose offers disagree about brand, so a parsing accident
 * can never fuse two manufacturers.
 *
 *   npx tsx scripts/merge-exact-sku-laptops.ts --dry-run
 *   npx tsx scripts/merge-exact-sku-laptops.ts
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";
import { extractLaptopSku } from "../src/lib/laptopSku";

const dryRun = process.argv.includes("--dry-run");

function brandOf(title: string) {
  return title.trim().split(/[\s/,]+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const offers = await prisma.productOffer.findMany({
    where: {
      isActive: true,
      product: { isPublic: true, archivedAt: null, matchingLocked: false, category: { slug: "laptops" } },
    },
    select: {
      id: true, title: true, currentPrice: true, productId: true,
      shop: { select: { name: true } },
      product: { select: { id: true, name: true, offers: { where: { isActive: true }, select: { id: true } } } },
    },
  });

  const bySku = new Map<string, typeof offers>();
  for (const offer of offers) {
    const sku = extractLaptopSku(offer.title);
    if (!sku) continue;
    bySku.set(sku, [...(bySku.get(sku) ?? []), offer]);
  }

  let merged = 0;
  let moved = 0;

  for (const [sku, group] of bySku) {
    if (new Set(group.map((o) => o.shop.name)).size < 2) continue;
    const productIds = new Set(group.map((o) => o.productId));
    if (productIds.size < 2) continue;

    // A parsing accident must never fuse two manufacturers.
    if (new Set(group.map((o) => brandOf(o.title))).size > 1) {
      console.log(`SKIP ${sku}: offers disagree on brand — ${group.map((o) => brandOf(o.title)).join(", ")}`);
      continue;
    }

    // Keep the product that already carries the most offers; it is the one
    // most likely to hold history, images and alerts.
    const keep = group
      .map((offer) => offer.product)
      .filter((product): product is NonNullable<(typeof group)[number]["product"]> => Boolean(product))
      .sort((a, b) => b.offers.length - a.offers.length)[0];
    if (!keep) continue;

    const strays = group.filter((o) => o.productId !== keep.id);
    if (!strays.length) continue;

    merged += 1;
    moved += strays.length;
    console.log(`\n${sku}  ->  ${keep.name.slice(0, 50)}`);
    for (const offer of group) {
      const mark = offer.productId === keep.id ? "keep" : "move";
      console.log(`  ${mark}  ${offer.shop.name.padEnd(18)} ${String(offer.currentPrice).padStart(9)}  ${offer.title.slice(0, 46)}`);
    }
    if (dryRun) continue;

    await prisma.productOffer.updateMany({
      where: { id: { in: strays.map((o) => o.id) } },
      data: { productId: keep.id },
    });

    // Products emptied by the move would otherwise linger as dead pages.
    for (const orphanId of new Set(strays.map((o) => o.productId))) {
      const left = await prisma.productOffer.count({ where: { productId: orphanId, isActive: true } });
      if (left === 0) {
        await prisma.product.update({ where: { id: orphanId }, data: { isPublic: false, archivedAt: new Date() } });
      }
    }
  }

  console.log(`\n${dryRun ? "would merge" : "merged"} ${merged} SKU groups, moving ${moved} offers`);
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
