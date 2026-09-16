/**
 * Splits phone products that hold both an eSIM-only handset and a physical-SIM
 * one.
 *
 *   Apple iPhone 17 Pro | 512GB Silver
 *     physical  Elite Electronics  4409.99
 *     esim      Zoommer            4149      <- different SKU
 *     physical  Zoommer            4299
 *
 * They are different products at different prices — Zoommer sells the eSIM
 * iPhone 17 Pro 150 GEL under the physical one — so a page holding both
 * advertises a saving that does not exist: the "cheapest" offer is a handset
 * the visitor may not want.
 *
 * Splitting costs nothing here and usually gains: each variant keeps offers
 * from more than one shop, so one mixed comparison becomes two honest ones.
 *
 * SIM is read from the title, the only signal both shops express comparably —
 * Zoommer writes "e-SIM Only", EE appends "eSIM", while the stored specs say
 * "E Sim" at one shop and "Nano Sim + E Sim" at the other.
 *
 *   npx tsx scripts/split-mixed-sim-phones.ts --dry-run
 *   npx tsx scripts/split-mixed-sim-phones.ts
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { normalizeProductName, slugifyProduct } from "../src/lib/matching";

const dryRun = process.argv.includes("--dry-run");

function simOf(title: string) {
  return /\be ?sim\b/.test(title.toLowerCase().replace(/[^a-z0-9]+/g, " ")) ? "esim" : "physical";
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const products = await prisma.product.findMany({
    where: {
      isPublic: true, archivedAt: null, matchingLocked: false,
      category: { slug: "mobiles" }, offers: { some: { isActive: true } },
    },
    select: {
      id: true, name: true, categoryId: true, categoryConfidence: true, categoryNeedsReview: true,
      offers: { where: { isActive: true }, select: { id: true, title: true, imageUrl: true, currentPrice: true, shop: { select: { name: true } } } },
    },
  });

  let split = 0;
  let moved = 0;

  for (const product of products) {
    if (product.offers.length < 2) continue;
    const variants = new Set(product.offers.map((offer) => simOf(offer.title)));
    if (variants.size < 2) continue;

    // The product keeps whatever its own name claims, so the surviving page
    // keeps the title people already reach it by.
    const keep = simOf(product.name);
    const strays = product.offers.filter((offer) => simOf(offer.title) !== keep);
    if (!strays.length || strays.length === product.offers.length) continue;

    split += 1;
    moved += strays.length;
    console.log(`\n${product.name.slice(0, 50)}  (keeps "${keep}")`);
    for (const offer of product.offers) {
      const mark = simOf(offer.title) === keep ? "keep" : "move";
      console.log(`  ${mark}  ${offer.shop.name.padEnd(18)} ${String(offer.currentPrice).padStart(9)}  ${offer.title.slice(0, 44)}`);
    }
    if (dryRun) continue;

    const lead = strays[0];
    const separate = await prisma.product.create({
      data: {
        name: lead.title,
        normalizedName: normalizeProductName(lead.title),
        slug: `${slugifyProduct(lead.title)}-${randomUUID().slice(0, 6)}`,
        imageUrl: lead.imageUrl,
        categoryId: product.categoryId,
        categoryConfidence: product.categoryConfidence,
        categoryNeedsReview: product.categoryNeedsReview,
        categoryReason: `SIM split: an eSIM-only handset is a different SKU from the physical-SIM one.`,
        missingOfferDiscoveryStatus: "PENDING",
      },
    });
    await prisma.productOffer.updateMany({
      where: { id: { in: strays.map((offer) => offer.id) } },
      data: { productId: separate.id },
    });
  }

  console.log(`\n${dryRun ? "would split" : "split"} ${split} products, moving ${moved} offers`);
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
