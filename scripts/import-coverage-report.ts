import "./load-env";
import { prisma } from "../src/lib/prisma";

// Read-only coverage snapshot of the current database (no scraping):
// how many RawOffers and public offers exist per store × category, plus the
// RawOffer pipeline status breakdown. Use it to verify how complete the
// imported phone/laptop dataset is after running the importer + pipeline.
//
// For a live "discovered vs imported" gap, run `import:full-coverage` which
// compares sitemap discovery against what was saved.

const STORES = ["zoommer", "ee", "pcshop"];
const CATEGORIES = ["mobiles", "laptops"];

function pad(v: string | number, n: number, right = false) {
  const s = String(v);
  return right ? s.padStart(n) : s.padEnd(n);
}

async function main() {
  if (!prisma) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const db = prisma;

  const shops = await db.shop.findMany({ select: { id: true, slug: true } });
  const shopIdBySlug = new Map(shops.map((s) => [s.slug, s.id]));

  console.log("═".repeat(74));
  console.log("  IMPORT COVERAGE REPORT (database snapshot)  " + new Date().toISOString());
  console.log("═".repeat(74));

  console.log("\n  RAW OFFERS (imported), by store × category:");
  console.log("  " + pad("STORE", 10) + pad("CATEGORY", 10) + pad("RAW", 8, true) +
    pad("NORMALIZED", 12, true) + pad("ATTACHED", 10, true) + pad("NEEDS_REVIEW", 14, true));

  for (const slug of STORES) {
    const shopId = shopIdBySlug.get(slug);
    for (const category of CATEGORIES) {
      if (!shopId) {
        console.log("  " + pad(slug, 10) + pad(category, 10) + pad("(no shop row)", 30));
        continue;
      }
      const where = { shopId, categorySlug: category };
      const [total, normalized, attached, needsReview] = await Promise.all([
        db.rawOffer.count({ where }),
        db.rawOffer.count({ where: { ...where, status: "NORMALIZED" } }),
        db.rawOffer.count({ where: { ...where, status: "ATTACHED" } }),
        db.rawOffer.count({ where: { ...where, categoryNeedsReview: true } }),
      ]);
      console.log("  " + pad(slug, 10) + pad(category, 10) + pad(total, 8, true) +
        pad(normalized, 12, true) + pad(attached, 10, true) + pad(needsReview, 14, true));
    }
  }

  // Public offers (what users actually see) per store × category.
  console.log("\n  PUBLIC OFFERS (visible on site), by store × category:");
  console.log("  " + pad("STORE", 10) + pad("mobiles", 12, true) + pad("laptops", 12, true));
  for (const slug of STORES) {
    const shopId = shopIdBySlug.get(slug);
    if (!shopId) { console.log("  " + pad(slug, 10) + "(no shop row)"); continue; }
    const counts: Record<string, number> = {};
    for (const category of CATEGORIES) {
      counts[category] = await db.productOffer.count({
        where: {
          shop: { id: shopId, enabled: true },
          currentPrice: { gt: 0 },
          matchStatus: "CONFIRMED",
          verificationStatus: "CONFIRMED",
          product: {
            isPublic: true, archivedAt: null, needsReview: false, categoryNeedsReview: false,
            OR: [{ category: { slug: category } }, { categorySuggestedSlug: category }],
          },
        },
      });
    }
    console.log("  " + pad(slug, 10) + pad(counts.mobiles, 12, true) + pad(counts.laptops, 12, true));
  }

  // Public distinct products per category.
  console.log("\n  PUBLIC PRODUCTS (distinct), by category:");
  for (const category of CATEGORIES) {
    const n = await db.product.count({
      where: {
        isPublic: true, archivedAt: null, needsReview: false, categoryNeedsReview: false,
        OR: [{ category: { slug: category } }, { categorySuggestedSlug: category }],
        offers: { some: { shop: { enabled: true }, currentPrice: { gt: 0 }, matchStatus: "CONFIRMED", verificationStatus: "CONFIRMED" } },
      },
    });
    console.log("  " + pad(category, 10) + pad(n, 8, true));
  }

  console.log("\n" + "═".repeat(74));
}

main()
  .finally(async () => { if (prisma) await prisma.$disconnect(); })
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
