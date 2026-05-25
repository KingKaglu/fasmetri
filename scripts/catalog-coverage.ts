import "./load-env";
import { prisma } from "../src/lib/prisma";
import { getCatalogCoverageSummary } from "../src/lib/catalogCoverage";

if (!prisma) throw new Error("DATABASE_URL is required.");

async function main() {
  const summary = await getCatalogCoverageSummary();
  console.log("Catalog coverage totals");
  console.table(summary.totals);
  console.log("Store coverage");
  console.table(
    summary.stores.map((store) => ({
      shop: store.slug,
      enabled: store.enabled,
      rawOffers: store.rawOffers,
      confirmedOffers: store.confirmedOffers,
      parentProducts: store.parentProducts,
      variants: store.variants,
      publicProducts: store.publicProducts,
      missingCategory: store.missingCategory,
      missingImage: store.missingImage,
      missingPrice: store.missingPrice,
      needsReview: store.needsReview,
      excluded: store.excludedFromPublic,
      failedRuns: store.failedRuns,
      status: store.ingestionStatus,
      lastIngestedAt: store.lastIngestedAt,
    })),
  );
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
