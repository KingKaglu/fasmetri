/**
 * Splits public phone products whose offers describe two DIFFERENT devices —
 * a Fold 8 and a Fold 8 Ultra, a POCO X8 Pro and a POCO X8 Pro Max — into one
 * product per tier.
 *
 * These were merged before safeProductMatcher gained its tier gate, and the
 * links are already written, so the gate alone cannot undo them. They matter
 * more than their count suggests: because the two devices are hundreds of lari
 * apart, the bogus pairs sorted straight to the top of "biggest price gap" and
 * were the most advertisable — and most wrong — comparisons on the site.
 *
 * The product keeps whatever tier its own name claims; every offer of another
 * tier moves to a new product of its own, mirroring how rematch-products.ts
 * splits an offer it can no longer confirm.
 *
 *   npx tsx scripts/split-mixed-tier-products.ts --dry-run
 *   npx tsx scripts/split-mixed-tier-products.ts
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { normalizeProductName, slugifyProduct } from "../src/lib/matching";
import { phoneModelTier } from "../src/server/matching/safeProductMatcher";

const dryRun = process.argv.includes("--dry-run");

function tierOf(text: string) {
  return phoneModelTier(text) ?? "base";
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const products = await prisma.product.findMany({
    where: {
      isPublic: true,
      archivedAt: null,
      matchingLocked: false,
      category: { slug: "mobiles" },
      offers: { some: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      categoryId: true,
      categoryConfidence: true,
      categoryNeedsReview: true,
      offers: { where: { isActive: true }, select: { id: true, title: true, imageUrl: true, currentPrice: true, shop: { select: { name: true } } } },
    },
  });

  let productsSplit = 0;
  let offersMoved = 0;

  for (const product of products) {
    if (product.offers.length < 2) continue;
    const keep = tierOf(product.name);
    const strays = product.offers.filter((offer) => tierOf(offer.title) !== keep);
    // Every offer disagreeing with the name is not a mixed product — it is a
    // mis-named one. Leave those alone rather than emptying the product.
    if (!strays.length || strays.length === product.offers.length) continue;

    productsSplit += 1;
    console.log(`\n${product.name}`);
    console.log(`  keeps tier "${keep}":`);
    for (const offer of product.offers.filter((o) => !strays.includes(o))) {
      console.log(`    ${offer.shop.name.padEnd(18)} ${String(offer.currentPrice).padStart(9)}  ${offer.title.slice(0, 54)}`);
    }

    // One new product per stray tier, so the two Ultra offers land together
    // rather than becoming two lonely single-shop products.
    const byTier = new Map<string, typeof strays>();
    for (const offer of strays) {
      const tier = tierOf(offer.title);
      byTier.set(tier, [...(byTier.get(tier) ?? []), offer]);
    }

    for (const [tier, offers] of byTier) {
      const lead = offers[0];
      console.log(`  splits tier "${tier}" into its own product:`);
      for (const offer of offers) {
        console.log(`    ${offer.shop.name.padEnd(18)} ${String(offer.currentPrice).padStart(9)}  ${offer.title.slice(0, 54)}`);
      }
      offersMoved += offers.length;
      if (dryRun) continue;

      const separate = await prisma.product.create({
        data: {
          name: lead.title,
          normalizedName: normalizeProductName(lead.title),
          slug: `${slugifyProduct(lead.title)}-${randomUUID().slice(0, 6)}`,
          imageUrl: lead.imageUrl,
          categoryId: product.categoryId,
          categoryConfidence: product.categoryConfidence,
          categoryNeedsReview: product.categoryNeedsReview,
          categoryReason: `tier split: "${tier}" is a different device from "${keep}".`,
        },
      });
      await prisma.productOffer.updateMany({
        where: { id: { in: offers.map((offer) => offer.id) } },
        data: { productId: separate.id },
      });
      // Let discovery look for this new product's twin in the other shops.
      await prisma.product.update({ where: { id: separate.id }, data: { missingOfferDiscoveryStatus: "PENDING" } });
    }
  }

  console.log(`\n${dryRun ? "would split" : "split"} ${productsSplit} products, moving ${offersMoved} offers`);
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
