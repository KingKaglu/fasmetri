/**
 * One-off audit: shop/product/deal counts as the public site sees them.
 * Read-only. Run: npx tsx scripts/audit-db-state.ts
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";

async function main() {
  if (!prisma) {
    console.log("No prisma client (DATABASE_URL missing)");
    return;
  }

  const shops = await prisma.shop.findMany({ orderBy: { name: "asc" } });
  console.log("=== Shops ===");
  for (const shop of shops) {
    const offerCount = await prisma.productOffer.count({ where: { shopId: shop.id } });
    const activePublicOffers = await prisma.productOffer.count({
      where: {
        shopId: shop.id,
        isActive: true,
        currentPrice: { gt: 0 },
        matchStatus: { in: ["CONFIRMED", "MATCHED", "ATTACHED"] as never },
        verificationStatus: "CONFIRMED",
      },
    });
    console.log(
      `${shop.slug}: enabled=${shop.enabled} needsConfig=${shop.needsConfiguration} lastScraped=${shop.lastScrapedAt?.toISOString() ?? "never"} offers=${offerCount} activePublic=${activePublicOffers}`,
    );
  }

  console.log("\n=== Public products by category ===");
  const products = await prisma.product.findMany({
    where: {
      isPublic: true,
      archivedAt: null,
      needsReview: false,
      categoryNeedsReview: false,
      OR: [
        { category: { slug: { in: ["mobiles", "laptops"] } } },
        { categorySuggestedSlug: { in: ["mobiles", "laptops"] } },
      ],
      offers: {
        some: {
          shop: { enabled: true },
          currentPrice: { gt: 0 },
          isActive: true,
          matchStatus: { in: ["CONFIRMED", "MATCHED", "ATTACHED"] as never },
          verificationStatus: "CONFIRMED",
        },
      },
    },
    include: {
      category: true,
      offers: {
        where: {
          shop: { enabled: true },
          currentPrice: { gt: 0 },
          isActive: true,
          matchStatus: { in: ["CONFIRMED", "MATCHED", "ATTACHED"] as never },
          verificationStatus: "CONFIRMED",
        },
        include: { shop: true },
      },
    },
  });

  const byCat = new Map<string, { products: number; deals: number; inStock: number; outOfStock: number }>();
  const byShop = new Map<string, number>();
  let deals = 0;
  for (const product of products) {
    const slug = product.category?.slug ?? product.categorySuggestedSlug ?? "?";
    const entry = byCat.get(slug) ?? { products: 0, deals: 0, inStock: 0, outOfStock: 0 };
    entry.products += 1;
    const hasDeal = product.offers.some((o) => o.discountPercent > 0 && o.oldPrice && Number(o.oldPrice) > Number(o.currentPrice));
    if (hasDeal) {
      entry.deals += 1;
      deals += 1;
    }
    if (product.offers.some((o) => o.availability === "IN_STOCK")) entry.inStock += 1;
    else entry.outOfStock += 1;
    byCat.set(slug, entry);
    for (const shopId of new Set(product.offers.map((o) => o.shop.slug))) {
      byShop.set(shopId, (byShop.get(shopId) ?? 0) + 1);
    }
  }
  console.log("total public products:", products.length, "deals:", deals);
  for (const [slug, entry] of byCat) console.log(slug, JSON.stringify(entry));
  console.log("\n=== Public products per shop ===");
  for (const [slug, count] of byShop) console.log(slug, count);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
