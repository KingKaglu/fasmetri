import "./load-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { FasmetriCategorySlug } from "../src/config/categoryMapping";
import { validateProductCategory } from "../src/lib/categoryValidation";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const options = parseBatchOptions("validate-category-assignments", { limit: 200 });
  const id = checkpointId("validate-category-assignments", options);

  const products = await prisma.product.findMany({
    where: {
      id: options.cursor ? { gt: options.cursor } : undefined,
      name: options.q ? { contains: options.q, mode: "insensitive" } : undefined,
      offers: options.shop ? { some: { shop: { slug: options.shop } } } : undefined,
      category: options.category ? { slug: options.category } : undefined,
    },
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      categoryLocked: true,
      manualCategoryId: true,
      category: { select: { slug: true } },
      offers: {
        take: 6,
        orderBy: { updatedAt: "desc" },
        select: {
          title: true,
          url: true,
          shop: { select: { slug: true } },
        },
      },
    },
    orderBy: { id: "asc" },
    skip: options.cursor ? 0 : options.offset,
    take: options.limit,
  });

  let mismatches = 0;
  let improvements = 0;
  let locked = 0;
  let needsReview = 0;
  const mismatchLog: Array<{ name: string; current: string | null; suggested: string; confidence: number }> = [];

  for (const product of products) {
    if (product.categoryLocked || product.manualCategoryId) {
      locked += 1;
      continue;
    }

    const leadOffer = product.offers[0];
    const result = validateProductCategory({
      title: product.name,
      brand: product.brand,
      model: product.model,
      scrapedShopCategory: product.category?.slug,
      sourceShop: leadOffer?.shop.slug,
      imageAlt: leadOffer?.title,
      breadcrumbs: product.offers.flatMap((offer) => [offer.title, offer.url]),
      currentCategorySlug: (product.category?.slug as FasmetriCategorySlug) ?? null,
      categoryLocked: product.categoryLocked,
    });

    if (result.isMismatch) {
      mismatches += 1;
      mismatchLog.push({
        name: product.name,
        current: result.currentSlug,
        suggested: result.publicCategorySlug,
        confidence: result.confidenceScore,
      });
    } else if (result.isImprovement) {
      improvements += 1;
    }

    if (result.needsReview) needsReview += 1;
  }

  if (!options.dryRun) {
    console.log("Note: validate-category-assignments is read-only. Run recategorize-products to apply changes.");
  }

  const showCount = Math.min(mismatchLog.length, 40);
  for (const entry of mismatchLog.slice(0, showCount)) {
    console.log(`[MISMATCH] ${entry.name}`);
    console.log(`  current=${entry.current ?? "none"} -> suggested=${entry.suggested} (${entry.confidence}%)`);
  }
  if (mismatchLog.length > showCount) {
    console.log(`...and ${mismatchLog.length - showCount} more mismatches.`);
  }

  const progress = {
    checkpointId: id,
    cursor: products.at(-1)?.id ?? options.cursor,
    created: 0,
    updated: 0,
    skipped: locked,
    failed: 0,
    processed: products.length,
    nextOffset: options.offset + products.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("validate-category-assignments", progress);
  console.log(
    `Validated ${products.length} products. ` +
    `Mismatches: ${mismatches}. ` +
    `Improvements available: ${improvements}. ` +
    `Needs review: ${needsReview}. ` +
    `Locked/manual: ${locked}.`,
  );
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
