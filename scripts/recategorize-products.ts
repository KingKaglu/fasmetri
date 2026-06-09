import "./load-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PUBLIC_CATEGORY_SLUGS, PUBLIC_CATEGORY_TAXONOMY } from "../src/config/categoryMapping";
import { categorizeProduct } from "../src/lib/categorizeProduct";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function ensurePublicCategories() {
  for (const slug of PUBLIC_CATEGORY_SLUGS) {
    const category = PUBLIC_CATEGORY_TAXONOMY[slug];
    await prisma.category.upsert({
      where: { slug },
      update: { nameKa: category.nameKa, nameEn: category.nameEn },
      create: { slug, nameKa: category.nameKa, nameEn: category.nameEn },
    });
  }
  return new Map(
    (await prisma.category.findMany({ where: { slug: { in: [...PUBLIC_CATEGORY_SLUGS] } }, select: { id: true, slug: true } })).map((category) => [
      category.slug,
      category.id,
    ]),
  );
}

async function main() {
  const options = parseBatchOptions("recategorize-products", { limit: 200 });
  const id = checkpointId("recategorize-products", options);
  const categoryIds = await ensurePublicCategories();
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
      categoryId: true,
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
  const productUpdates: Array<{
    id: string;
    name: string;
    changedCategory: boolean;
    slug: string;
    confidence: number;
    data: Parameters<typeof prisma.product.update>[0]["data"];
  }> = [];
  let reviewed = 0;
  let locked = 0;

  for (const product of products) {
    if (product.categoryLocked || product.manualCategoryId) {
      locked += 1;
      continue;
    }

    const leadOffer = product.offers[0];
    const decision = categorizeProduct({
      title: product.name,
      brand: product.brand,
      model: product.model,
      scrapedShopCategory: product.category?.slug,
      sourceShop: leadOffer?.shop.slug,
      imageAlt: leadOffer?.title,
      breadcrumbs: product.offers.flatMap((offer) => [offer.title, offer.url]),
    });
    const categoryId = categoryIds.get(decision.publicCategorySlug);
    if (!categoryId) {
      reviewed += 1;
      continue;
    }

    if (decision.needsReview) reviewed += 1;
    productUpdates.push({
      id: product.id,
      name: product.name,
      changedCategory: !decision.needsReview && product.categoryId !== categoryId,
      slug: decision.publicCategorySlug,
      confidence: decision.confidenceScore,
      data: {
        categoryId: decision.needsReview ? undefined : categoryId,
        categoryConfidence: decision.confidenceScore,
        categoryNeedsReview: decision.needsReview,
        categorySuggestedSlug: decision.publicCategorySlug,
        categoryReason: decision.reason,
        categoryMatchedRules: decision.matchedRules,
        categorySourceSignals: {
          scrapedShopCategory: product.category?.slug ?? null,
          sourceShop: leadOffer?.shop.slug ?? null,
          sourceTitles: product.offers.map((offer) => offer.title),
        },
      },
    });
  }

  let failed = 0;
  if (options.dryRun) {
    console.log(`Dry run: ${productUpdates.length} category decisions would be updated.`);
  } else {
    for (let index = 0; index < productUpdates.length; index += 12) {
      const batch = productUpdates.slice(index, index + 12);
      const results = await Promise.allSettled(batch.map((update) => prisma.product.update({ where: { id: update.id }, data: update.data })));
      failed += results.filter((result) => result.status === "rejected").length;
    }
  }

  const changed = productUpdates.filter((update) => update.changedCategory);
  for (const update of changed.slice(0, 20)) {
    console.log(`${update.name} -> ${update.slug} (${update.confidence})`);
  }
  if (changed.length > 20) console.log(`...and ${changed.length - 20} more category changes.`);
  const reviewCandidates = productUpdates.filter((update) => !update.changedCategory && update.data.categoryNeedsReview);
  for (const update of reviewCandidates.slice(0, 20)) {
    console.log(`[review] ${update.name} -> suggested ${update.slug} (${update.confidence}); category retained.`);
  }
  if (reviewCandidates.length > 20) console.log(`...and ${reviewCandidates.length - 20} more review candidates.`);
  const progress = {
    checkpointId: id,
    cursor: products.at(-1)?.id ?? options.cursor,
    created: 0,
    updated: options.dryRun ? 0 : productUpdates.length - failed,
    skipped: locked,
    failed,
    processed: products.length,
    nextOffset: options.offset + products.length,
  };
  if (!options.dryRun) writeCheckpoint(options.checkpoint, progress);
  logProgress("recategorize-products", progress);
  console.log(`Recategorized ${changed.length} products. ${reviewed} need category review. ${locked} manual or locked products were preserved.`);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
