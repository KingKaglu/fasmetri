import "./load-env";
import * as cheerio from "cheerio";
import { STORE_CONFIGS, findStoreConfig } from "../src/config/enabledStores";
import { findStoreAdapter, getAdapterStatus, getStoreCoverageReport } from "../src/server/stores";
import { findAdapter } from "../src/server/scrapers/shops";
import { createImportBatch, logImportProgress } from "../src/lib/importPipeline";
import { scrapeShop } from "../src/server/scrapers/runner";
import { prisma } from "../src/lib/prisma";
import { parseBatchOptions, writeCheckpoint, checkpointId } from "./job-utils";
import { extractProductIdentity } from "../src/lib/productIdentity";
import { categorizeProduct } from "../src/lib/categorizeProduct";
import { extractVariantIdentity } from "../src/lib/variantMatching";
import { normalizeProductTitle, removeNoiseWords } from "../src/lib/productNormalization";
import type { ScrapedOffer } from "../src/server/scrapers/types";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@sazoge.ge)";

function hr(char = "─", width = 60) {
  return char.repeat(width);
}
function field(label: string, value: string | number | boolean, width = 28) {
  return `  ${String(label).padEnd(width)} ${value}`;
}

async function showProductUrlPreview(storeKey: string, options: ReturnType<typeof parseBatchOptions>) {
  const adapter = findAdapter(storeKey);
  if (!adapter?.listProductUrls || !adapter.parseProductPage) return;

  const categorySlug = options.category;
  if (!categorySlug) {
    console.log("\n  Tip: add --category=mobiles for a live product preview.");
    return;
  }

  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  console.log(`\n${hr("═")}`);
  console.log(`  LIVE PREVIEW — sitemap product-URL mode (fetches up to 5 product pages, no DB writes)`);
  console.log(`  Category: ${categorySlug}`);
  console.log(`  Note: real import uses the full sitemap for this category.`);

  let allUrls: string[] = [];
  const fetchErrors: string[] = [];
  try {
    allUrls = await adapter.listProductUrls(categorySlug);
    console.log(`  Sitemap URLs found for category: ${allUrls.length}`);
  } catch (error) {
    console.log(`  [ERROR] Failed to load sitemap: ${error instanceof Error ? error.message : "unknown error"}`);
    return;
  }

  const previewUrls = allUrls.slice(options.offset, options.offset + Math.min(5, options.limit));
  const allOffers: ScrapedOffer[] = [];

  for (const rawUrl of previewUrls) {
    try {
      const url = new URL(rawUrl);
      const response = await fetch(url.toString(), {
        headers: { "user-agent": userAgent, "accept-language": "ka-GE,ka;q=0.9,en;q=0.8" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        fetchErrors.push(`HTTP ${response.status} from ${url.pathname}`);
        continue;
      }
      const html = await response.text();
      const offer = adapter.parseProductPage({ $: cheerio.load(html), html, url });
      if (offer) allOffers.push(offer);
    } catch (error) {
      fetchErrors.push(`${rawUrl}: ${error instanceof Error ? error.message : "fetch error"}`);
    }
  }

  const validOffers = allOffers.filter((o) => o.price > 0);
  const missingPrice = allOffers.length - validOffers.length;
  const missingImage = validOffers.filter((o) => !o.imageUrl).length;

  let needsReviewCount = 0;
  for (const offer of validOffers) {
    const cat = categorizeProduct({ title: offer.title, brand: offer.brand, scrapedShopCategory: offer.categorySlug });
    if (cat.needsReview) needsReviewCount++;
  }

  console.log(`\n  ═══ DRY-RUN METRICS (sitemap preview) ══════════════════════`);
  console.log(field("Total URLs in sitemap", allUrls.length));
  console.log(field("Product pages fetched", previewUrls.length));
  console.log(field("Parsed successfully (price > 0)", validOffers.length));
  console.log(field("Parse failures (missing price)", missingPrice));
  console.log(field("Missing image", missingImage));
  console.log(field("Needs category review", `${needsReviewCount} of ${validOffers.length}`));
  console.log(field("Fetch errors", fetchErrors.length));
  if (fetchErrors.length) {
    for (const err of fetchErrors) console.log(`    ✗ ${err}`);
  }

  await showSampleOffers(validOffers, options.limit);

  const estMinutes = Math.ceil((allUrls.length * (adapter.rateLimitMs + 2000)) / 60000);
  console.log(`\n  ═══ RISKS BEFORE REAL IMPORT ═══════════════════════════════`);
  console.log(`  1. SPEED: ~${allUrls.length} products × ${adapter.rateLimitMs}ms rate limit ≈ ${estMinutes} min total.`);
  console.log(`  2. OUTLET: Products under /autleti/ are outlet condition — priced lower than new.`);
  console.log(`  3. DEDUPLICATION: Same product may appear as outlet and regular; stored as separate offers.`);
  console.log(`  4. CATEGORY REVIEW: ${needsReviewCount} of ${validOffers.length} sampled products need review.`);
  console.log(`\n  ─── To run real import when ready: ──────────────────────────`);
  console.log(`  npm run import:store:full -- --shop=${storeKey} --category=${categorySlug} --limit=${options.limit}`);
}

async function showSampleOffers(validOffers: ScrapedOffer[], sampleLimit: number) {
  const sample = validOffers.slice(0, Math.min(10, sampleLimit, validOffers.length));
  if (sample.length === 0) {
    console.log("\n  [PREVIEW] No valid products extracted.");
    return;
  }
  console.log(`\n  ═══ SAMPLE PRODUCTS (showing ${sample.length}) ══════════════════`);
  for (let i = 0; i < sample.length; i++) {
    const offer = sample[i];
    const discount = offer.oldPrice && offer.oldPrice > offer.price
      ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100) : 0;
    const normalizedTitle = normalizeProductTitle(offer.title);
    const cleanTitle = removeNoiseWords(offer.title);
    const identity = extractProductIdentity({ title: offer.title, brand: offer.brand, model: offer.model, categorySlug: offer.categorySlug });
    const categoryDecision = categorizeProduct({ title: offer.title, brand: offer.brand, model: offer.model, scrapedShopCategory: offer.categorySlug, breadcrumbs: offer.breadcrumbs });
    const variantId = extractVariantIdentity(identity);
    const isOutlet = offer.breadcrumbs?.includes("outlet") ?? false;

    console.log(`\n  ┌─ [${i + 1}/${sample.length}] ${offer.title.slice(0, 70)}${isOutlet ? " [OUTLET]" : ""}`);
    console.log(`  │  originalTitle:      ${offer.title}`);
    console.log(`  │  originalUrl:        ${offer.url}`);
    console.log(`  │  originalImage:      ${offer.imageUrl ?? "(none)"}`);
    console.log(`  │  rawPrice:           ${offer.price} GEL${isOutlet ? "  ← OUTLET PRICE" : ""}`);
    console.log(`  │  rawOldPrice:        ${offer.oldPrice != null ? offer.oldPrice + " GEL" : "(none)"}`);
    console.log(`  │  rawDiscount:        ${discount ? discount + "%" : "(n/a)"}`);
    console.log(`  │  rawAvailability:    ${offer.availability}`);
    console.log(`  │  condition:          ${isOutlet ? "outlet" : "new"}`);
    console.log(`  │  sourceCategory:     ${offer.categorySlug ?? "(none)"}`);
    console.log(`  │  normalizedTitle:    ${normalizedTitle}`);
    console.log(`  │  cleanTitle:         ${cleanTitle}`);
    console.log(`  │  ── Extracted Identity ──────────────────────────────────`);
    console.log(`  │  brand:              ${identity.brand ?? "?"}`);
    console.log(`  │  model:              ${identity.model ?? "?"}`);
    console.log(`  │  storage:            ${identity.storage ?? "?"}`);
    console.log(`  │  color:              ${identity.color ?? "?"}`);
    console.log(`  │  ram:                ${identity.ram ?? "?"}`);
    console.log(`  │  canonicalKey:       ${identity.canonicalKey ?? "(none)"}`);
    console.log(`  │  ── Classification ──────────────────────────────────────`);
    const reviewFlag = categoryDecision.needsReview ? " ⚠ NEEDS REVIEW" : " ✓";
    console.log(`  │  suggestedCategory:  ${categoryDecision.publicCategorySlug} (${categoryDecision.confidenceScore}%)${reviewFlag}`);
    console.log(`  │  parentKey:          ${variantId.canonicalParentKey ?? "(none)"}`);
    console.log(`  └─ variantKey:         ${variantId.canonicalVariantKey ?? "(none)"}`);
  }
}

async function showLivePreview(storeKey: string, options: ReturnType<typeof parseBatchOptions>) {
  const adapter = findAdapter(storeKey);

  // Sitemap-based adapters: fetch product pages directly
  if ((!adapter?.parseDocument || !adapter.categoryUrls) && adapter?.listProductUrls && adapter.parseProductPage) {
    await showProductUrlPreview(storeKey, options);
    return;
  }

  if (!adapter?.parseDocument || !adapter.categoryUrls) {
    console.log("\n  [PREVIEW UNAVAILABLE] Adapter does not support category listing mode.");
    return;
  }

  const categorySlug = options.category;
  if (!categorySlug) {
    console.log("\n  Tip: add --category=mobiles for a live product preview.");
    return;
  }

  const paths = adapter.categoryUrls[categorySlug];
  if (!paths?.length) {
    console.log(`\n  [PREVIEW UNAVAILABLE] No category URL for "${categorySlug}" in adapter.`);
    console.log(`  Available: ${Object.keys(adapter.categoryUrls).join(", ")}`);
    return;
  }

  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const allOffers: ScrapedOffer[] = [];
  const fetchErrors: string[] = [];

  console.log(`\n${hr("═")}`);
  console.log(`  LIVE PREVIEW — fetching category listing (single HTTP request, no DB writes)`);
  console.log(`  URL: ${adapter.baseUrl}${paths[0]}`);
  console.log(`  Note: preview uses category listing mode (JSON-LD). Real import uses sitemap discovery.`);

  for (const path of paths) {
    const url = new URL(path, adapter.baseUrl);
    try {
      const response = await fetch(url.toString(), {
        headers: { "user-agent": userAgent, "accept-language": "ka-GE,ka;q=0.9,en;q=0.8" },
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) {
        fetchErrors.push(`HTTP ${response.status} ${response.statusText} from ${url.pathname}`);
        continue;
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      const parsed = adapter.parseDocument($, categorySlug);
      allOffers.push(...parsed);
    } catch (error) {
      fetchErrors.push(`${url.pathname}: ${error instanceof Error ? error.message : "fetch error"}`);
    }
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueOffers: ScrapedOffer[] = [];
  let duplicateCount = 0;
  for (const offer of allOffers) {
    if (seenUrls.has(offer.url)) { duplicateCount++; continue; }
    seenUrls.add(offer.url);
    uniqueOffers.push(offer);
  }

  const validOffers = uniqueOffers.filter((o) => o.price > 0);
  const missingPrice = uniqueOffers.length - validOffers.length;
  const missingImage = uniqueOffers.filter((o) => !o.imageUrl).length;

  // Run category analysis on all valid offers to count needsReview
  let needsReviewCount = 0;
  for (const offer of validOffers) {
    const cat = categorizeProduct({ title: offer.title, brand: offer.brand, scrapedShopCategory: offer.categorySlug });
    if (cat.needsReview) needsReviewCount++;
  }

  const sampleLimit = Math.min(10, options.limit, validOffers.length);
  const sample = validOffers.slice(options.offset, options.offset + sampleLimit);

  // ── Metrics ──────────────────────────────────────────────────
  console.log(`\n  ═══ DRY-RUN METRICS ════════════════════════════════════════`);
  console.log(field("Products discovered", uniqueOffers.length));
  console.log(field("Parsed successfully (price > 0)", validOffers.length));
  console.log(field("Parse failures (missing price)", missingPrice));
  console.log(field("Duplicate URLs", duplicateCount));
  console.log(field("Missing image", missingImage));
  console.log(field("Needs category review", `${needsReviewCount} of ${validOffers.length}`));
  console.log(field("Fetch errors", fetchErrors.length));
  if (fetchErrors.length) {
    for (const err of fetchErrors) console.log(`    ✗ ${err}`);
  }

  // ── Sample Products ───────────────────────────────────────────
  if (sample.length === 0) {
    console.log("\n  [PREVIEW] No valid products extracted. Adapter may need configuration.");
    return;
  }

  console.log(`\n  ═══ SAMPLE PRODUCTS (showing ${sample.length} of ${validOffers.length} valid) ═══`);

  for (let i = 0; i < sample.length; i++) {
    const offer = sample[i];
    const discount =
      offer.oldPrice && offer.oldPrice > offer.price
        ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)
        : 0;
    const normalizedTitle = normalizeProductTitle(offer.title);
    const cleanTitle = removeNoiseWords(offer.title);
    const identity = extractProductIdentity({
      title: offer.title,
      brand: offer.brand,
      model: offer.model,
      categorySlug: offer.categorySlug,
    });
    const categoryDecision = categorizeProduct({
      title: offer.title,
      brand: offer.brand,
      model: offer.model,
      scrapedShopCategory: offer.categorySlug,
      breadcrumbs: offer.breadcrumbs,
    });
    const variantId = extractVariantIdentity(identity);

    console.log(`\n  ┌─ [${i + 1}/${sampleLimit}] ${offer.title.slice(0, 70)}`);
    console.log(`  │  originalTitle:      ${offer.title}`);
    console.log(`  │  originalUrl:        ${offer.url}`);
    console.log(`  │  originalImage:      ${offer.imageUrl ?? "(none)"}`);
    console.log(`  │  rawPrice:           ${offer.price} GEL`);
    console.log(`  │  rawOldPrice:        ${offer.oldPrice != null ? offer.oldPrice + " GEL" : "(not in listing — requires product page)"}`);
    console.log(`  │  rawDiscount:        ${discount ? discount + "%" : "(n/a from listing)"}`);
    console.log(`  │  rawAvailability:    ${offer.availability}`);
    console.log(`  │  sourceCategory:     ${offer.categorySlug ?? "(none)"}`);
    console.log(`  │  sourceBreadcrumbs:  ${(offer.breadcrumbs ?? []).join(" › ")}`);
    console.log(`  │  rawSpecsJson:       {} (listing mode — specs from product page only)`);
    console.log(`  │  normalizedTitle:    ${normalizedTitle}`);
    console.log(`  │  cleanTitle:         ${cleanTitle}`);
    console.log(`  │  ── Extracted Identity ──────────────────────────────────`);
    console.log(`  │  brand:              ${identity.brand ?? "?"}`);
    console.log(`  │  model:              ${identity.model ?? "?"}`);
    console.log(`  │  storage:            ${identity.storage ?? "?"}`);
    console.log(`  │  color:              ${identity.color ?? "?"}`);
    console.log(`  │  ram:                ${identity.ram ?? "?"}`);
    console.log(`  │  simType:            ${identity.simType ?? "?"}`);
    console.log(`  │  canonicalKey:       ${identity.canonicalKey ?? "(none — missing storage/brand/model)"}`);
    console.log(`  │  ── Classification ──────────────────────────────────────`);
    const reviewFlag = categoryDecision.needsReview ? " ⚠ NEEDS REVIEW" : " ✓";
    console.log(`  │  suggestedCategory:  ${categoryDecision.publicCategorySlug} (${categoryDecision.confidenceScore}%)${reviewFlag}`);
    console.log(`  │  matchedRules:       ${categoryDecision.matchedRules.slice(0, 3).join(", ") || "(none)"}`);
    console.log(`  │  parentKey:          ${variantId.canonicalParentKey ?? "(none — need brand+model+storage)"}`);
    console.log(`  └─ variantKey:         ${variantId.canonicalVariantKey ?? "(none)"}`);
  }

  // ── Risks ─────────────────────────────────────────────────────
  const estMinutes = Math.ceil((options.limit * (adapter.rateLimitMs + 2000)) / 60000);
  console.log(`\n  ═══ RISKS BEFORE REAL IMPORT ═══════════════════════════════`);
  console.log(`  1. SPEED: Real import uses sitemap URL discovery (3s rate limit × ${options.limit} products`);
  console.log(`     ≈ ${estMinutes} min). Preview used listing mode (${paths.length} HTTP requests — fast).`);
  console.log(`  2. OLD PRICES: rawOldPrice not available from category listing — only from product pages.`);
  console.log(`     Real import (product-URL mode) will fetch individual pages and capture old prices.`);
  console.log(`  3. CATEGORY REVIEW: ${needsReviewCount} of ${validOffers.length} products will have`);
  console.log(`     categoryNeedsReview=true and won't be public. Run recategorize-products after import.`);
  console.log(`  4. DEDUPLICATION: Products without canonicalKey won't deduplicate across stores reliably.`);
  console.log(`  5. VISIBILITY: Products need CONFIRMED offers before they appear on website.`);
  console.log(`     Run match-offers-to-variants and recategorize-products after import.`);
  console.log(`\n  ─── To run real import when ready: ──────────────────────────`);
  const flags = [`--shop=${storeKey}`, `--category=${categorySlug}`, `--limit=${options.limit}`];
  if (options.safeMode) flags.push("--safe-mode");
  console.log(`  npm run import:store:full -- ${flags.join(" ")}`);
}

async function showDryRun(storeKey: string, options: ReturnType<typeof parseBatchOptions>) {
  const config = findStoreConfig(storeKey);
  if (!config) {
    console.log(`Unknown store: "${storeKey}"`);
    console.log(`Known stores: ${STORE_CONFIGS.map((s) => s.key).join(", ")}`);
    process.exit(1);
  }

  const adapter = findStoreAdapter(storeKey);
  const status = getAdapterStatus(storeKey);

  const [rawOfferCount, lastBatch] = await Promise.all([
    db.rawOffer.count({ where: { storeKey } }),
    db.rawOffer.findFirst({
      where: { storeKey },
      orderBy: { scrapedAt: "desc" },
      select: { importBatchId: true, scrapedAt: true },
    }),
  ]);

  console.log(hr("═"));
  console.log(`  import-store  [DRY RUN]  shop=${storeKey}  ${new Date().toISOString()}`);
  console.log(hr("═"));

  console.log("\n  Store config:");
  console.log(field("Key", config.key));
  console.log(field("Name", config.name));
  console.log(field("Base URL", config.baseUrl));
  console.log(field("Enabled", String(config.enabled)));
  console.log(field("Priority", config.priority));

  if (!config.enabled) {
    console.log(`\n  [SKIPPED] Store is disabled in src/config/enabledStores.ts.`);
    console.log(`  To enable: set enabled=true for "${storeKey}"`);
    console.log(`  Then configure adapter: src/server/stores/${storeKey}.adapter.ts`);
    console.log(hr("═"));
    return;
  }

  console.log("\n  Adapter:");
  console.log(field("Status", status));
  if (adapter?.categoryUrls && Object.keys(adapter.categoryUrls).length > 0) {
    console.log(field("Category URLs", ""));
    for (const [cat, paths] of Object.entries(adapter.categoryUrls)) {
      console.log(`    ${cat}: ${paths.join(", ")}`);
    }
  }
  console.log(field("Rate limit", `${adapter?.rateLimitMs ?? "?"}ms`));

  if (status === "needs_configuration") {
    console.log(`\n  [NEEDS_CONFIGURATION] Adapter is not ready to scrape.`);
    console.log(`  Configure: src/server/stores/${storeKey}.adapter.ts`);
    console.log(`             src/server/scrapers/shops/${storeKey}.ts`);
  } else if (status === "disabled") {
    console.log(`\n  [DISABLED] Adapter status is disabled.`);
  }

  console.log("\n  Database state:");
  console.log(field("Existing RawOffers", rawOfferCount));
  console.log(field("Last batch", lastBatch?.importBatchId ?? "(none)"));
  console.log(field("Last scraped", lastBatch?.scrapedAt?.toISOString() ?? "(never)"));

  console.log("\n  Import plan:");
  console.log(field("Shop", storeKey));
  console.log(field("Category", options.category ?? "(all)"));
  console.log(field("Limit", options.limit));
  console.log(field("Offset", options.offset));
  console.log(field("Raw-only", "true (RawOffer only, no matching)"));
  console.log(field("Safe mode", String(options.safeMode)));

  // Live preview when adapter is ready and a category is specified
  if (status === "ready") {
    await showLivePreview(storeKey, options);
  }

  console.log(`\n${hr("═")}`);
  console.log("  DRY RUN COMPLETE — no data changed.");
  console.log(hr("═"));
}

async function showAllDryRun() {
  const report = getStoreCoverageReport();
  const counts = await db.rawOffer.groupBy({
    by: ["storeKey"],
    _count: { id: true },
    where: { storeKey: { not: null } },
  });
  const rawByStore = Object.fromEntries(
    counts.map((r) => [r.storeKey, r._count.id]),
  );

  console.log(hr("═"));
  console.log(`  import:all:staged  [DRY RUN]  ${new Date().toISOString()}`);
  console.log(hr("═"));
  console.log(`\n  ${"STORE".padEnd(16)} ${"PRIORITY".padEnd(10)} ${"STATUS".padEnd(22)} ${"RAW OFFERS".padStart(10)}`);
  console.log(`  ${hr("-", 16)} ${hr("-", 10)} ${hr("-", 22)} ${hr("-", 10)}`);
  for (const { config, status } of report) {
    const raw = rawByStore[config.key] ?? 0;
    const flag = !config.enabled ? "(disabled)" : status === "ready" ? "" : `(${status})`;
    console.log(`  ${config.key.padEnd(16)} ${config.priority.padEnd(10)} ${(status + " " + flag).padEnd(22)} ${String(raw).padStart(10)}`);
  }

  const enabled = report.filter((r) => r.config.enabled);
  const ready = enabled.filter((r) => r.status === "ready");
  const needsConfig = enabled.filter((r) => r.status !== "ready");
  console.log(`\n  Enabled: ${enabled.length} stores (${ready.length} ready, ${needsConfig.length} needs_configuration)`);
  if (ready.length > 0) {
    console.log(`  Would import from: ${ready.map((r) => r.config.key).join(", ")}`);
  }
  console.log(`\n  To import all ready stores:`);
  console.log(`  npm run import:all:staged`);
  console.log(`\n${hr("═")}`);
  console.log("  DRY RUN COMPLETE — no data changed.");
  console.log(hr("═"));
}

async function runImport(storeKey: string, options: ReturnType<typeof parseBatchOptions>, batchId: string) {
  const config = findStoreConfig(storeKey);
  if (!config) {
    console.error(`Unknown store: "${storeKey}". Check src/config/enabledStores.ts`);
    process.exit(1);
  }
  if (!config.enabled) {
    console.error(`Store "${storeKey}" is disabled in enabledStores.ts. Aborting.`);
    process.exit(1);
  }
  const status = getAdapterStatus(storeKey);
  if (status !== "ready") {
    console.error(`Store "${storeKey}" adapter status is "${status}". Aborting.`);
    console.error(`Configure the adapter at: src/server/stores/${storeKey}.adapter.ts`);
    process.exit(1);
  }

  console.log(`Starting import: shop=${storeKey} batch=${batchId} limit=${options.limit} offset=${options.offset}${options.safeMode ? " safe-mode" : ""}`);
  process.env.SCRAPER_ENABLED = "true";
  const start = Date.now();

  const run = await scrapeShop(storeKey, {
    category: options.category,
    dryRun: false,
    importBatchId: batchId,
    limit: options.limit,
    offset: options.offset,
    rawOnly: true,
    url: options.url,
  });

  const offersSeen = ("offersSeen" in run ? run.offersSeen : 0) ?? 0;
  const offersCreated = ("offersCreated" in run ? run.offersCreated : 0) ?? 0;
  const offersUpdated = ("offersUpdated" in run ? run.offersUpdated : 0) ?? 0;
  const offersSkipped = ("offersSkipped" in run ? run.offersSkipped : 0) ?? 0;
  const durationMs = Date.now() - start;

  logImportProgress({
    batchId,
    storeKey,
    processed: offersSeen,
    created: offersCreated,
    updated: offersUpdated,
    skipped: offersSkipped,
    failed: 0,
    durationMs,
  });

  return { offersSeen, offersCreated, offersUpdated, offersSkipped, durationMs };
}

async function main() {
  const options = parseBatchOptions("import-store", { limit: 100 });
  const id = checkpointId("import-store", options);
  const batchId = createImportBatch(options.shop ?? "all", options.category);

  if (options.dryRun) {
    if (!options.shop || options.shop === "all") {
      await showAllDryRun();
    } else {
      await showDryRun(options.shop, options);
    }
    return;
  }

  if (!options.shop || options.shop === "all") {
    const report = getStoreCoverageReport();
    const readyStores = report.filter((r) => r.config.enabled && r.status === "ready");
    if (readyStores.length === 0) {
      console.log("No stores are enabled and ready. Run with --dry-run to see status.");
      return;
    }
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalProcessed = 0;
    for (const { config } of readyStores) {
      const storeBatchId = createImportBatch(config.key, options.category);
      const result = await runImport(config.key, options, storeBatchId);
      totalProcessed += result.offersSeen;
      totalCreated += result.offersCreated;
      totalUpdated += result.offersUpdated;
    }
    const progress = {
      checkpointId: id,
      processed: totalProcessed,
      created: totalCreated,
      updated: totalUpdated,
      skipped: 0,
      failed: 0,
      nextOffset: options.offset + options.limit,
    };
    writeCheckpoint(options.checkpoint, progress);
    console.log(`import:all: processed=${totalProcessed} created=${totalCreated} updated=${totalUpdated}`);
    return;
  }

  const result = await runImport(options.shop, options, batchId);
  const progress = {
    checkpointId: id,
    processed: result.offersSeen,
    created: result.offersCreated,
    updated: result.offersUpdated,
    skipped: result.offersSkipped,
    failed: 0,
    nextOffset: options.offset + options.limit,
  };
  writeCheckpoint(options.checkpoint, progress);
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
