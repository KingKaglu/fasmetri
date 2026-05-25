import "./load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

async function main() {
  const options = parseBatchOptions("reset-product-catalog", { limit: 200 });
  const id = checkpointId("reset-product-catalog", options);
  const confirmed = process.env.CONFIRM_PRODUCT_RESET === "true";
  const dryRun = options.dryRun || !confirmed;

  const [
    productCount,
    offerCount,
    rawOfferCount,
    parentCount,
    variantCount,
    clickCount,
    categoryCount,
    shopCount,
    sampleProducts,
  ] = await Promise.all([
    db.product.count(),
    db.productOffer.count(),
    db.rawOffer.count(),
    db.parentProduct.count(),
    db.productVariant.count(),
    db.clickEvent.count(),
    db.category.count(),
    db.shop.count(),
    db.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: Math.min(options.limit, 300),
      select: { id: true, slug: true, name: true, canonicalKey: true, categoryId: true, isPublic: true, archivedAt: true },
    }),
  ]);

  const backup = {
    createdAt: new Date().toISOString(),
    dryRun,
    confirmed,
    counts: { products: productCount, offers: offerCount, rawOffers: rawOfferCount, parentProducts: parentCount, variants: variantCount, clicks: clickCount, categories: categoryCount, shops: shopCount },
    sampleProducts,
    note: "Reset is non-destructive by default. Products are archived/hidden, RawOffer data and ClickEvent history are preserved.",
  };
  const backupDir = join(".codex-logs", "catalog-backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(backupDir, `reset-product-catalog-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log(`Backup snapshot written to ${backupPath}`);
  console.log(`Plan: archive ${productCount} Product rows, detach ${offerCount} ProductOffer rows, keep ${rawOfferCount} RawOffer rows, keep ${clickCount} ClickEvent rows.`);
  console.log("Keeping categories, shops, admin users, settings, click tracking history, and raw imports.");

  if (dryRun) {
    console.log("Dry run only. Set CONFIRM_PRODUCT_RESET=true and omit --dry-run to apply.");
    const progress = {
      checkpointId: id,
      created: 0,
      updated: 0,
      skipped: productCount + offerCount + rawOfferCount,
      failed: 0,
      processed: productCount + offerCount + rawOfferCount,
      nextOffset: options.offset,
    };
    logProgress("reset-product-catalog", progress);
    return;
  }

  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const matchCandidates = await tx.offerMatchCandidate.deleteMany({});
    const possibleMatches = await tx.possibleProductMatch.deleteMany({});
    const productVerifications = await tx.productVerification.deleteMany({});
    const storeVerifications = await tx.productStoreVerification.deleteMany({});
    const evidence = await tx.offerVerificationEvidence.deleteMany({});
    const offers = await tx.productOffer.updateMany({
      data: {
        parentProductId: null,
        variantId: null,
        matchStatus: "UNVERIFIED",
        matchConfidence: null,
        verificationStatus: "UNVERIFIED",
      },
    });
    const rawOffers = await tx.rawOffer.updateMany({
      data: {
        productId: null,
        parentProductId: null,
        variantId: null,
        status: "NORMALIZED",
        processedAt: null,
        errorMessage: null,
      },
    });
    const products = await tx.product.updateMany({
      data: {
        isPublic: false,
        needsReview: true,
        archivedAt: now,
        missingOfferDiscoveryStatus: "RESET_ARCHIVED",
      },
    });
    const variants = await tx.productVariant.deleteMany({});
    const parents = await tx.parentProduct.deleteMany({});
    return { matchCandidates, possibleMatches, productVerifications, storeVerifications, evidence, offers, rawOffers, products, variants, parents };
  });

  const progress = {
    checkpointId: id,
    created: 0,
    updated: result.products.count + result.offers.count + result.rawOffers.count,
    skipped: 0,
    failed: 0,
    processed: productCount + offerCount + rawOfferCount,
    nextOffset: options.offset,
  };
  writeCheckpoint(options.checkpoint, progress);
  logProgress("reset-product-catalog", progress);
  console.log(result);
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
