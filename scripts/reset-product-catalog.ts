import "./load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

function hr(char = "─", width = 60) {
  return char.repeat(width);
}

function row(label: string, value: string | number, width = 38) {
  const l = String(label).padEnd(width, ".");
  return `  ${l} ${value}`;
}

async function main() {
  const options = parseBatchOptions("reset-product-catalog", { limit: 200 });
  const id = checkpointId("reset-product-catalog", options);
  const confirmed = process.env.CONFIRM_PRODUCT_RESET === "true";
  const dryRun = options.dryRun || !confirmed;
  const mode = dryRun ? "DRY RUN" : "LIVE RESET";

  console.log(hr("═"));
  console.log(`  reset-product-catalog  [${mode}]`);
  console.log(`  ${new Date().toISOString()}`);
  if (dryRun) {
    console.log("  No data will be changed. Pass CONFIRM_PRODUCT_RESET=true to apply.");
  } else {
    console.log("  !! CONFIRMED — catalog will be archived/reset.");
  }
  console.log(hr("═"));

  // ── Inventory ───────────────────────────────────────────────────
  console.log("\nInventory...");
  const [
    productTotal,
    productAlreadyArchived,
    productPublic,
    productCategoryOk,
    offerTotal,
    offerConfirmed,
    offerUnverified,
    rawOfferTotal,
    clickTotal,
    priceHistoryTotal,
    parentTotal,
    variantTotal,
    matchCandidateTotal,
    possibleMatchTotal,
    verificationTotal,
    storeVerificationTotal,
    evidenceTotal,
    categoryTotal,
    shopTotal,
    sampleToArchive,
    categoryBreakdown,
    shopBreakdown,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { archivedAt: { not: null } } }),
    db.product.count({ where: { isPublic: true, archivedAt: null } }),
    db.product.count({ where: { categoryNeedsReview: false } }),
    db.productOffer.count(),
    db.productOffer.count({ where: { matchStatus: "CONFIRMED" } }),
    db.productOffer.count({ where: { matchStatus: "UNVERIFIED" } }),
    db.rawOffer.count(),
    db.clickEvent.count(),
    db.priceHistory.count(),
    db.parentProduct.count(),
    db.productVariant.count(),
    db.offerMatchCandidate.count(),
    db.possibleProductMatch.count(),
    db.productVerification.count(),
    db.productStoreVerification.count(),
    db.offerVerificationEvidence.count(),
    db.category.count(),
    db.shop.count(),
    db.product.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        isPublic: true,
        categoryNeedsReview: true,
        needsReview: true,
        archivedAt: true,
        category: { select: { slug: true } },
        offers: {
          take: 1,
          select: { matchStatus: true, currentPrice: true, shop: { select: { slug: true } } },
        },
      },
    }),
    db.product.groupBy({
      by: ["categoryId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
    db.productOffer.groupBy({
      by: ["shopId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
  ]);

  // Fetch category and shop names for the breakdowns
  const categoryIds = categoryBreakdown.map((r) => r.categoryId).filter(Boolean) as string[];
  const shopIds = shopBreakdown.map((r) => r.shopId);
  const [categoryNames, shopNames] = await Promise.all([
    db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, slug: true } }),
    db.shop.findMany({ where: { id: { in: shopIds } }, select: { id: true, slug: true } }),
  ]);
  const categoryById = Object.fromEntries(categoryNames.map((c) => [c.id, c.slug]));
  const shopById = Object.fromEntries(shopNames.map((s) => [s.id, s.slug]));

  const productNotArchived = productTotal - productAlreadyArchived;
  const offerOther = offerTotal - offerConfirmed - offerUnverified;

  // ── Write backup snapshot ───────────────────────────────────────
  const backupDir = join(".codex-logs", "catalog-backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `reset-product-catalog-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  const snapshot = {
    createdAt: new Date().toISOString(),
    mode,
    confirmed,
    counts: {
      products: productTotal,
      productsAlreadyArchived: productAlreadyArchived,
      productsToArchive: productNotArchived,
      productsPublic: productPublic,
      productsCategoryOk: productCategoryOk,
      offers: offerTotal,
      offersConfirmed: offerConfirmed,
      offersUnverified: offerUnverified,
      rawOffers: rawOfferTotal,
      clicks: clickTotal,
      priceHistory: priceHistoryTotal,
      parentProducts: parentTotal,
      variants: variantTotal,
      matchCandidates: matchCandidateTotal,
      possibleMatches: possibleMatchTotal,
      verifications: verificationTotal,
      storeVerifications: storeVerificationTotal,
      evidence: evidenceTotal,
      categories: categoryTotal,
      shops: shopTotal,
    },
    sampleProductsToArchive: sampleToArchive,
    note: "Reset is non-destructive for source data. Products archived, RawOffer and ClickEvent history preserved.",
  };
  writeFileSync(backupPath, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot written → ${backupPath}\n`);

  // ── Products ────────────────────────────────────────────────────
  console.log(hr());
  console.log("  PRODUCTS");
  console.log(hr());
  console.log(row("Total products", productTotal));
  console.log(row("Already archived (archivedAt set)", productAlreadyArchived));
  console.log(row("Not yet archived  [would ARCHIVE]", productNotArchived));
  console.log(row("Currently public (isPublic=true)", productPublic));
  console.log(row("Category confirmed (categoryNeedsReview=false)", productCategoryOk));

  if (categoryBreakdown.length > 0) {
    console.log("\n  Top categories:");
    for (const entry of categoryBreakdown) {
      const slug = entry.categoryId ? (categoryById[entry.categoryId] ?? entry.categoryId) : "(uncategorized)";
      console.log(`    ${String(entry._count.id).padStart(5)} products in "${slug}"`);
    }
  }

  // ── Offers ──────────────────────────────────────────────────────
  console.log(`\n${hr()}`);
  console.log("  OFFERS");
  console.log(hr());
  console.log(row("Total offers", offerTotal));
  console.log(row("matchStatus=CONFIRMED  [would RESET]", offerConfirmed));
  console.log(row("matchStatus=UNVERIFIED  [already clean]", offerUnverified));
  console.log(row("Other match status", offerOther));

  if (shopBreakdown.length > 0) {
    console.log("\n  Top shops by offer count:");
    for (const entry of shopBreakdown) {
      const slug = shopById[entry.shopId] ?? entry.shopId;
      console.log(`    ${String(entry._count.id).padStart(5)} offers from "${slug}"`);
    }
  }

  // ── Derivative data ─────────────────────────────────────────────
  console.log(`\n${hr()}`);
  console.log("  GENERATED / COMPUTED DATA  [would DELETE]");
  console.log(hr());
  console.log(row("ParentProduct rows", parentTotal));
  console.log(row("ProductVariant rows", variantTotal));
  console.log(row("OfferMatchCandidate rows", matchCandidateTotal));
  console.log(row("PossibleProductMatch rows", possibleMatchTotal));
  console.log(row("ProductVerification rows", verificationTotal));
  console.log(row("ProductStoreVerification rows", storeVerificationTotal));
  console.log(row("OfferVerificationEvidence rows", evidenceTotal));

  // ── Preserved data ──────────────────────────────────────────────
  console.log(`\n${hr()}`);
  console.log("  SOURCE / AUDIT DATA  [will be KEPT]");
  console.log(hr());
  console.log(row("RawOffer rows", rawOfferTotal));
  console.log(row("ClickEvent rows", clickTotal));
  console.log(row("PriceHistory rows", priceHistoryTotal));
  console.log(row("Category rows", categoryTotal));
  console.log(row("Shop rows", shopTotal));

  // ── Sample products ─────────────────────────────────────────────
  if (sampleToArchive.length > 0) {
    console.log(`\n${hr()}`);
    console.log(`  SAMPLE PRODUCTS TO ARCHIVE (up to 10, most recently updated)`);
    console.log(hr());
    for (const p of sampleToArchive) {
      const offer = p.offers[0];
      const shopSlug = offer?.shop.slug ?? "-";
      const matchStatus = offer?.matchStatus ?? "-";
      const price = offer?.currentPrice ? `${offer.currentPrice} GEL` : "-";
      const flags = [
        p.isPublic ? "public" : "hidden",
        p.categoryNeedsReview ? "cat?" : "cat✓",
        p.needsReview ? "review!" : "ok",
      ].join(" ");
      console.log(`  [${flags}] ${p.name.slice(0, 45).padEnd(45)} | shop:${shopSlug} match:${matchStatus} price:${price}`);
    }
  }

  // ── What the reset does ─────────────────────────────────────────
  console.log(`\n${hr()}`);
  console.log("  RESET PLAN");
  console.log(hr());
  console.log(`  1. DELETE  ${matchCandidateTotal} OfferMatchCandidate rows`);
  console.log(`  2. DELETE  ${possibleMatchTotal} PossibleProductMatch rows`);
  console.log(`  3. DELETE  ${verificationTotal} ProductVerification rows`);
  console.log(`  4. DELETE  ${storeVerificationTotal} ProductStoreVerification rows`);
  console.log(`  5. DELETE  ${evidenceTotal} OfferVerificationEvidence rows`);
  console.log(`  6. RESET   ${offerTotal} ProductOffer → matchStatus=UNVERIFIED, detach variant/parent`);
  console.log(`  7. RESET   ${rawOfferTotal} RawOffer → detach product/variant/parent links`);
  console.log(`  8. ARCHIVE ${productNotArchived} Product rows (archivedAt=now, isPublic=false, needsReview=true)`);
  console.log(`  9. DELETE  ${variantTotal} ProductVariant rows`);
  console.log(` 10. DELETE  ${parentTotal} ParentProduct rows`);
  console.log(`\n  KEEP: ${rawOfferTotal} RawOffer, ${clickTotal} ClickEvent, ${priceHistoryTotal} PriceHistory, ${categoryTotal} Category, ${shopTotal} Shop`);

  if (dryRun) {
    console.log(`\n${hr("═")}`);
    console.log("  DRY RUN COMPLETE — no data changed.");
    console.log("  To apply: CONFIRM_PRODUCT_RESET=true npm run reset-product-catalog");
    console.log(hr("═"));
    const progress = {
      checkpointId: id,
      created: 0,
      updated: 0,
      skipped: productTotal + offerTotal + rawOfferTotal,
      failed: 0,
      processed: productTotal + offerTotal + rawOfferTotal,
      nextOffset: options.offset,
    };
    logProgress("reset-product-catalog", progress);
    return;
  }

  // ── Execute ─────────────────────────────────────────────────────
  console.log(`\n${hr("═")}`);
  console.log("  EXECUTING RESET...");
  console.log(hr("═"));

  const now = new Date();
  let result: {
    matchCandidates: { count: number };
    possibleMatches: { count: number };
    productVerifications: { count: number };
    storeVerifications: { count: number };
    evidence: { count: number };
    offers: { count: number };
    rawOffers: { count: number };
    products: { count: number };
    variants: { count: number };
    parents: { count: number };
  };

  try {
    result = await db.$transaction(
      async (tx) => {
        console.log("  Step 1/10: Deleting OfferMatchCandidate...");
        const matchCandidates = await tx.offerMatchCandidate.deleteMany({});
        console.log(`           → ${matchCandidates.count} rows deleted`);

        console.log("  Step 2/10: Deleting PossibleProductMatch...");
        const possibleMatches = await tx.possibleProductMatch.deleteMany({});
        console.log(`           → ${possibleMatches.count} rows deleted`);

        console.log("  Step 3/10: Deleting ProductVerification...");
        const productVerifications = await tx.productVerification.deleteMany({});
        console.log(`           → ${productVerifications.count} rows deleted`);

        console.log("  Step 4/10: Deleting ProductStoreVerification...");
        const storeVerifications = await tx.productStoreVerification.deleteMany({});
        console.log(`           → ${storeVerifications.count} rows deleted`);

        console.log("  Step 5/10: Deleting OfferVerificationEvidence...");
        const evidence = await tx.offerVerificationEvidence.deleteMany({});
        console.log(`           → ${evidence.count} rows deleted`);

        console.log("  Step 6/10: Resetting ProductOffer (matchStatus, variant links)...");
        const offers = await tx.productOffer.updateMany({
          data: {
            parentProductId: null,
            variantId: null,
            matchStatus: "UNVERIFIED",
            matchConfidence: null,
            verificationStatus: "UNVERIFIED",
          },
        });
        console.log(`           → ${offers.count} offers reset`);

        console.log("  Step 7/10: Resetting RawOffer (product/variant links)...");
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
        console.log(`           → ${rawOffers.count} raw offers unlinked`);

        console.log("  Step 8/10: Archiving Product rows...");
        const products = await tx.product.updateMany({
          where: { archivedAt: null },
          data: {
            isPublic: false,
            needsReview: true,
            archivedAt: now,
            missingOfferDiscoveryStatus: "RESET_ARCHIVED",
          },
        });
        console.log(`           → ${products.count} products archived`);

        console.log("  Step 9/10: Deleting ProductVariant...");
        const variants = await tx.productVariant.deleteMany({});
        console.log(`           → ${variants.count} variants deleted`);

        console.log("  Step 10/10: Deleting ParentProduct...");
        const parents = await tx.parentProduct.deleteMany({});
        console.log(`           → ${parents.count} parent products deleted`);

        return { matchCandidates, possibleMatches, productVerifications, storeVerifications, evidence, offers, rawOffers, products, variants, parents };
      },
      { timeout: 60000 },
    );
  } catch (error) {
    console.error("\n  TRANSACTION FAILED — no data was changed (rolled back).");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const totalUpdated =
    result.products.count +
    result.offers.count +
    result.rawOffers.count;

  const totalDeleted =
    result.matchCandidates.count +
    result.possibleMatches.count +
    result.productVerifications.count +
    result.storeVerifications.count +
    result.evidence.count +
    result.variants.count +
    result.parents.count;

  console.log(`\n${hr("═")}`);
  console.log("  RESET COMPLETE");
  console.log(hr("═"));
  console.log(row("Products archived", result.products.count));
  console.log(row("Offers reset", result.offers.count));
  console.log(row("RawOffers unlinked", result.rawOffers.count));
  console.log(row("Computed rows deleted", totalDeleted));
  console.log(row("Total rows modified", totalUpdated + totalDeleted));
  console.log(row("Snapshot saved to", backupPath));

  const progress = {
    checkpointId: id,
    created: 0,
    updated: totalUpdated,
    skipped: productAlreadyArchived,
    failed: 0,
    processed: productTotal + offerTotal + rawOfferTotal,
    nextOffset: options.offset,
  };
  writeCheckpoint(options.checkpoint, progress);
  logProgress("reset-product-catalog", progress);
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
