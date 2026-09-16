/**
 * Splits public products whose offers are genuinely different colours — a black
 * phone priced against a white one, a Lavender against a Mist Blue.
 *
 * safeProductMatcher already treats a colour mismatch as a hard conflict, so
 * these are legacy links written before that gate (or before the colour
 * extraction fixes); the gate governs new matches and cannot undo old ones.
 *
 * Canonicalisation matters more than it looks here. Counting distinct RAW
 * colours flags 27 products, but most are marketing modifiers the matcher
 * collapses ON PURPOSE — Midnight Black is black, Light Blue is blue. Running
 * the same comparison through the matcher's own detectColorInText leaves 5 real
 * ones. Use the matcher's answer, never the raw string, or this script splits
 * products that were correctly merged.
 *
 * Offers whose colour cannot be read at all stay with the product: unknown is
 * not a mismatch.
 *
 *   npx tsx scripts/split-mixed-color-products.ts --dry-run
 *   npx tsx scripts/split-mixed-color-products.ts
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { normalizeProductName, slugifyProduct } from "../src/lib/matching";
import { detectColorInText } from "../src/server/matching/safeProductMatcher";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const products = await prisma.product.findMany({
    where: { isPublic: true, archivedAt: null, matchingLocked: false, offers: { some: { isActive: true } } },
    select: {
      id: true, name: true, categoryId: true, categoryConfidence: true, categoryNeedsReview: true,
      offers: {
        where: { isActive: true },
        select: { id: true, title: true, imageUrl: true, currentPrice: true, shop: { select: { name: true } } },
      },
    },
  });

  let productsSplit = 0;
  let offersMoved = 0;

  for (const product of products) {
    if (product.offers.length < 2) continue;

    const coloured = product.offers
      .map((offer) => ({ offer, color: detectColorInText(offer.title) }))
      .filter((entry): entry is { offer: (typeof product.offers)[number]; color: string } => Boolean(entry.color));
    const colors = new Set(coloured.map((entry) => entry.color));
    if (colors.size < 2) continue;

    // The product keeps whatever colour its own name claims; if its name has no
    // readable colour, keep the most common one rather than guessing.
    const named = detectColorInText(product.name);
    const tally = new Map<string, number>();
    for (const { color } of coloured) tally.set(color, (tally.get(color) ?? 0) + 1);
    const keep = named && colors.has(named)
      ? named
      : [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const strays = coloured.filter((entry) => entry.color !== keep);
    if (!strays.length || strays.length === coloured.length) continue;

    productsSplit += 1;
    console.log(`\n${product.name}`);
    console.log(`  keeps "${keep}":`);
    for (const { offer } of coloured.filter((entry) => entry.color === keep)) {
      console.log(`    ${offer.shop.name.padEnd(18)} ${String(offer.currentPrice).padStart(9)}  ${offer.title.slice(0, 52)}`);
    }

    const byColor = new Map<string, typeof strays>();
    for (const entry of strays) byColor.set(entry.color, [...(byColor.get(entry.color) ?? []), entry]);

    for (const [color, entries] of byColor) {
      const lead = entries[0].offer;
      console.log(`  splits "${color}" out:`);
      for (const { offer } of entries) {
        console.log(`    ${offer.shop.name.padEnd(18)} ${String(offer.currentPrice).padStart(9)}  ${offer.title.slice(0, 52)}`);
      }
      offersMoved += entries.length;
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
          categoryReason: `colour split: "${color}" is a different variant from "${keep}".`,
          missingOfferDiscoveryStatus: "PENDING",
        },
      });
      await prisma.productOffer.updateMany({
        where: { id: { in: entries.map((entry) => entry.offer.id) } },
        data: { productId: separate.id },
      });
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
