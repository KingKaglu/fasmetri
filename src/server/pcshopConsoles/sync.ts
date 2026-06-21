import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { OfferAvailability, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAnomalousPriceChange, recordPriceAnomaly } from "@/server/sync/priceAnomalyGuard";
import { normalizeProductName, slugifyProduct } from "@/lib/matching";
import { normalizeProductTitle, removeNoiseWords } from "@/lib/productNormalization";

const STORE = "pcshop";
const SOURCE = "pcshop";
const SOURCE_CATEGORY = "playstation";
const FASMETRI_CATEGORY = "gaming";
const STORE_BASE_URL = "https://pcshop.ge";
const LISTING_API_URL = "https://pcshop.ge/wp-json/wc/store/v1/products";
const LISTING_SEARCH = "playstation";
const PAGE_LIMIT = 100;
const USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 2;
const MIN_REQUEST_DELAY_MS = 450;
const LOW_COUNT_RATIO = 0.7;
const MAX_MISSING_PRICE_RATIO = 0.1;
const INACTIVE_MISS_THRESHOLD = 3;
// Lock IDs in use: 85520260605 (zoommer-phones), 53120260605 (zoommer-laptops),
//                  37720260605 (ee-phones), 5820260605 (ee-laptops)
const ADVISORY_LOCK_ID = 90000000001;

type JsonRecord = Record<string, unknown>;

export type PcshopConsoleSyncMode = "discover" | "full" | "prices" | "validate" | "promote";

export type PcshopConsoleSyncOptions = {
  mode: PcshopConsoleSyncMode;
  promote?: boolean;
  rawFile?: string;
  reportDir?: string;
  rawDir?: string;
  dryRun?: boolean;
};

// WooCommerce Store API product shape (subset we use)
type WooProduct = {
  id: number;
  name: string;
  slug: string;
  sku?: string | null;
  permalink: string;
  is_in_stock: boolean;
  images: Array<{ src: string; alt?: string }>;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_minor_unit: number;
    currency_code: string;
  };
  short_description?: string | null;
  description?: string | null;
  attributes?: Array<{ name: string; value: string }> | null;
};

type NormalizedConsoleSpecs = {
  brand?: string;
  model?: string;
  version?: "Digital" | "CD" | "Standard" | "Bundle" | string;
  storageGb?: number;
  color?: string;
  cpu?: string;
  gpu?: string;
  ramGb?: number;
  releaseYear?: number;
};

export type StagedPcshopConsole = {
  store: typeof STORE;
  source: typeof SOURCE;
  sourceCategory: typeof SOURCE_CATEGORY;
  category: typeof SOURCE_CATEGORY;
  fasmetriCategorySlug: typeof FASMETRI_CATEGORY;
  uniqueKey: string;
  externalId: string | null;
  productCode?: string;
  sku?: string;
  originalTitle: string;
  brand?: string;
  productUrl: string;
  canonicalUrl: string;
  imageUrl?: string;
  currentPriceGel: number | null;
  oldPriceGel: number | null;
  discountAmountGel: number | null;
  discountPercent: number;
  installmentPriceGel: null;
  availability: OfferAvailability;
  scrapedAt: string;
  listingPage: number;
  rawListingData: JsonRecord;
  detailAttempted: false;
  detailSucceeded: false;
  allImages: string[];
  rawSpecs: JsonRecord;
  normalizedSpecs: NormalizedConsoleSpecs;
};

export type PcshopConsolesSnapshot = {
  version: 1;
  mode: "discover" | "full" | "prices";
  sourceUrl: typeof LISTING_API_URL;
  startedAt: string;
  finishedAt?: string;
  listing: {
    firstBatchCount: number;
    totalBatchesLoaded: number;
    totalPagesExpected: number;
    productsCountFromApi: number;
    totalUniqueConsoleUrls: number;
    duplicateUrlCount: number;
    failedListingUrls: string[];
    seeMoreExhausted: boolean;
  };
  products: StagedPcshopConsole[];
  failedDetailUrls: Array<{ url: string; reason: string }>;
  rawFile?: string;
};

type ValidationReport = {
  totalListingProductsDiscovered: number;
  totalUniqueProductUrls: number;
  totalDetailPagesAttempted: number;
  totalDetailPagesSucceeded: number;
  totalDetailPagesFailed: number;
  duplicateUrlCount: number;
  missingTitleCount: number;
  missingPriceCount: number;
  missingImageCount: number;
  nonConsoleProductCount: number;
  invalidStoreCount: number;
  invalidSourceCount: number;
  invalidCategoryCount: number;
  invalidPcshopUrlCount: number;
  duplicateUniqueKeyCount: number;
  oldActivePcshopConsoleCount: number;
  newScrapedPcshopConsoleCount: number;
  promotionStatus: "success" | "failed" | "requires_review" | "not_requested";
  hardFailures: string[];
  warnings: string[];
};

type PromotionReport = {
  totalImportedOrUpserted: number;
  totalUpdatedPrices: number;
  totalNewProducts: number;
  totalPossiblyRemovedProducts: number;
  totalMarkedInactive: number;
  skippedCount: number;
  priceAnomalyCount: number;
};

export type PcshopConsoleSyncReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  mode: PcshopConsoleSyncMode;
  rawFile?: string;
  reportFile?: string;
  latestReportFile?: string;
  discoveredCount: number;
  importedCount: number;
  updatedCount: number;
  failedCount: number;
  skippedCount: number;
  promotionResult: ValidationReport["promotionStatus"];
  warnings: string[];
  failedUrls: Array<{ url: string; reason: string }>;
  validation: ValidationReport;
  promotion?: PromotionReport;
};

type ExistingOfferState = {
  id: string;
  rawOfferId: string | null;
  url: string;
  currentPrice: Prisma.Decimal;
  oldPrice: Prisma.Decimal | null;
  availability: OfferAvailability;
  isOnSale: boolean;
  saleDetectedAt: Date | null;
  missedSyncCount: number;
  possiblyInactiveAt: Date | null;
  isActive: boolean;
};

const db = prisma;

export async function runPcshopConsoleSync(options: PcshopConsoleSyncOptions): Promise<PcshopConsoleSyncReport> {
  const startedAt = new Date();
  return withSyncLock(async () => {
    const snapshot =
      options.rawFile || options.mode === "validate" || options.mode === "promote"
        ? readSnapshot(options.rawFile)
        : await scrapeSnapshot(options);

    if (!snapshot.rawFile) {
      snapshot.rawFile = writeSnapshot(snapshot, options.rawDir);
    }

    const validation = await validateSnapshot(snapshot);
    const wantsPromotion = Boolean(options.promote || options.mode === "promote") && !options.dryRun;
    let promotion: PromotionReport | undefined;

    if (validation.hardFailures.length) {
      validation.promotionStatus = "failed";
    } else if (wantsPromotion) {
      promotion = await promoteSnapshot(snapshot);
      validation.promotionStatus = "success";
    } else {
      validation.promotionStatus = validation.warnings.length ? "requires_review" : "not_requested";
    }

    const finishedAt = new Date();
    const report: PcshopConsoleSyncReport = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      mode: options.mode,
      rawFile: snapshot.rawFile,
      discoveredCount: snapshot.products.length,
      importedCount: promotion?.totalImportedOrUpserted ?? 0,
      updatedCount: promotion?.totalUpdatedPrices ?? 0,
      failedCount: snapshot.failedDetailUrls.length + validation.hardFailures.length,
      skippedCount: promotion?.skippedCount ?? validation.missingPriceCount,
      promotionResult: validation.promotionStatus,
      warnings: validation.warnings,
      failedUrls: snapshot.failedDetailUrls,
      validation,
      promotion,
    };

    const reportFiles = writeReport(report, options.reportDir);
    report.reportFile = reportFiles.reportFile;
    report.latestReportFile = reportFiles.latestReportFile;
    if (validation.hardFailures.length && (options.promote || options.mode === "promote")) {
      throw new Error(`PCShop console sync validation failed: ${validation.hardFailures.join("; ")}`);
    }
    return report;
  });
}

async function scrapeSnapshot(options: PcshopConsoleSyncOptions): Promise<PcshopConsolesSnapshot> {
  const mode = options.mode === "full" ? "full" : options.mode === "prices" ? "prices" : "discover";
  const startedAt = new Date().toISOString();
  const listing = await discoverListing();

  // PCShop listing already provides all data (no detail fetch needed).
  const products = listing.products;

  const snapshot: PcshopConsolesSnapshot = {
    version: 1,
    mode,
    sourceUrl: LISTING_API_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    listing: {
      firstBatchCount: listing.firstBatchCount,
      totalBatchesLoaded: listing.totalBatchesLoaded,
      totalPagesExpected: listing.totalPagesExpected,
      productsCountFromApi: listing.productsCountFromApi,
      totalUniqueConsoleUrls: listing.products.length,
      duplicateUrlCount: listing.duplicateUrlCount,
      failedListingUrls: listing.failedListingUrls,
      seeMoreExhausted: listing.totalBatchesLoaded >= listing.totalPagesExpected && listing.failedListingUrls.length === 0,
    },
    products,
    failedDetailUrls: [],
  };
  return snapshot;
}

async function discoverListing() {
  const firstPageResult = await fetchListingPage(1);
  const productsCountFromApi = firstPageResult.total;
  const totalPagesExpected = Math.max(1, firstPageResult.totalPages);
  const allProducts: Array<{ product: WooProduct; page: number }> = firstPageResult.products.map((p) => ({ product: p, page: 1 }));
  const failedListingUrls: string[] = [];

  for (let page = 2; page <= totalPagesExpected; page += 1) {
    await sleep(MIN_REQUEST_DELAY_MS);
    try {
      const result = await fetchListingPage(page);
      allProducts.push(...result.products.map((p) => ({ product: p, page })));
    } catch (error) {
      const pageUrl = buildPageUrl(page);
      failedListingUrls.push(`${pageUrl}: ${errorMessage(error)}`);
    }
  }

  const unique = new Map<string, StagedPcshopConsole>();
  let duplicateUrlCount = 0;

  for (const item of allProducts) {
    const staged = stagedFromListing(item.product, item.page);
    if (!staged.productUrl) continue;
    if (unique.has(staged.productUrl)) {
      duplicateUrlCount += 1;
      continue;
    }
    unique.set(staged.productUrl, staged);
  }

  return {
    firstBatchCount: firstPageResult.products.length,
    totalBatchesLoaded: 1 + (totalPagesExpected - 1 - failedListingUrls.length),
    totalPagesExpected,
    productsCountFromApi,
    products: [...unique.values()],
    duplicateUrlCount,
    failedListingUrls,
  };
}

async function fetchListingPage(page: number): Promise<{ products: WooProduct[]; total: number; totalPages: number }> {
  const url = buildPageUrl(page);
  const response = await fetchWithRetry(url, {
    headers: {
      "user-agent": userAgent(),
      accept: "application/json",
      "accept-language": "en,ka;q=0.8",
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  const total = Number(response.headers.get("X-WP-Total") ?? "0");
  const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? "1");
  const products = (await response.json()) as WooProduct[];
  return {
    products: Array.isArray(products) ? products : [],
    total: Number.isFinite(total) ? total : 0,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
}

function buildPageUrl(page: number) {
  const url = new URL(LISTING_API_URL);
  url.searchParams.set("search", LISTING_SEARCH);
  url.searchParams.set("per_page", String(PAGE_LIMIT));
  url.searchParams.set("page", String(page));
  return url.toString();
}

function stagedFromListing(product: WooProduct, listingPage: number): StagedPcshopConsole {
  const productUrl = product.permalink ?? "";
  const title = String(product.name ?? "").trim();
  const { currentPriceGel, oldPriceGel } = parseWooPrices(product.prices);
  const discountAmountGel = computeDiscountAmount(currentPriceGel, oldPriceGel);
  const discountPct = computeDiscountPercent(currentPriceGel, oldPriceGel);
  const imageUrl = product.images?.[0]?.src ? String(product.images[0].src) : undefined;
  const allImages = product.images?.map((img) => img.src).filter((src): src is string => Boolean(src)) ?? [];
  const normalizedSpecs = normalizeConsoleSpecs(title, product);
  const id: string | null = product.id != null ? String(product.id) : null;
  const uniqueKey = id ? `${STORE}:${SOURCE_CATEGORY}:${id}` : `${STORE}:${SOURCE_CATEGORY}:${stableHash(productUrl)}`;

  return {
    store: STORE,
    source: SOURCE,
    sourceCategory: SOURCE_CATEGORY,
    category: SOURCE_CATEGORY,
    fasmetriCategorySlug: FASMETRI_CATEGORY,
    uniqueKey,
    externalId: id,
    productCode: product.sku ?? undefined,
    sku: product.sku ?? undefined,
    originalTitle: title,
    brand: normalizedSpecs.brand,
    productUrl,
    canonicalUrl: productUrl,
    imageUrl,
    currentPriceGel,
    oldPriceGel,
    discountAmountGel,
    discountPercent: discountPct,
    installmentPriceGel: null,
    availability: product.is_in_stock ? OfferAvailability.IN_STOCK : OfferAvailability.OUT_OF_STOCK,
    scrapedAt: new Date().toISOString(),
    listingPage,
    rawListingData: jsonRecord(product),
    detailAttempted: false,
    detailSucceeded: false,
    allImages,
    rawSpecs: extractRawSpecs(product),
    normalizedSpecs,
  };
}

function parseWooPrices(prices: WooProduct["prices"]): { currentPriceGel: number | null; oldPriceGel: number | null } {
  const minorUnit = prices.currency_minor_unit ?? 2;
  const divisor = Math.pow(10, minorUnit);

  const priceRaw = Number(prices.price);
  const regularRaw = Number(prices.regular_price);
  const saleRaw = Number(prices.sale_price);

  const currentPriceGel = Number.isFinite(priceRaw) && priceRaw > 0 ? Number((priceRaw / divisor).toFixed(2)) : null;
  // sale_price is non-zero and less than regular_price => we have a discount
  const hasDiscount =
    Number.isFinite(saleRaw) && Number.isFinite(regularRaw) && saleRaw > 0 && regularRaw > 0 && regularRaw > saleRaw;
  const oldPriceGel = hasDiscount ? Number((regularRaw / divisor).toFixed(2)) : null;

  return { currentPriceGel, oldPriceGel };
}

function computeDiscountAmount(price: number | null, oldPrice: number | null): number | null {
  if (price == null || oldPrice == null || oldPrice <= price) return null;
  return Number((oldPrice - price).toFixed(2));
}

function computeDiscountPercent(price: number | null, oldPrice: number | null): number {
  if (price == null || oldPrice == null || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function extractRawSpecs(product: WooProduct): JsonRecord {
  const descriptionText = stripHtml(product.short_description ?? product.description ?? "");
  const attributes: JsonRecord = {};
  for (const attr of product.attributes ?? []) {
    attributes[attr.name] = attr.value;
  }
  return {
    source: SOURCE,
    sourceCategory: SOURCE_CATEGORY,
    wooId: product.id,
    sku: product.sku,
    descriptionText,
    attributes,
  };
}

function normalizeConsoleSpecs(title: string, product: WooProduct): NormalizedConsoleSpecs {
  const lower = title.toLowerCase();

  // Brand detection
  let brand: string | undefined;
  if (/playstation|ps5|ps4|dualsense|dualshock/i.test(lower)) brand = "Sony";
  else if (/xbox|series x|series s/i.test(lower)) brand = "Microsoft";
  else if (/nintendo|switch/i.test(lower)) brand = "Nintendo";

  // Storage from title (e.g. "1TB", "825GB")
  const storageGb = normalizeStorageGb(title);

  // Edition/version from title or description
  const descText = stripHtml(product.short_description ?? product.description ?? "");
  const combinedText = `${title} ${descText}`;
  let version: NormalizedConsoleSpecs["version"];
  if (/digital\s+edition/i.test(combinedText)) {
    version = "Digital";
  } else if (/\bcd\b|disc\s+edition|blu.?ray/i.test(combinedText)) {
    version = "CD";
  } else if (/bundle/i.test(combinedText)) {
    version = "Bundle";
  } else if (/standard\s+edition/i.test(combinedText)) {
    version = "Standard";
  } else if (/version\s*:\s*(\w+)/i.test(combinedText)) {
    version = combinedText.match(/version\s*:\s*(\w+)/i)?.[1];
  }

  // Simple model extraction: "PlayStation 5", "PS5 Slim", "DualSense", etc.
  let model: string | undefined;
  if (/ps5\s+slim/i.test(lower) || /playstation\s+5\s+slim/i.test(lower)) model = "PlayStation 5 Slim";
  else if (/ps5|playstation\s+5/i.test(lower)) model = "PlayStation 5";
  else if (/ps4\s+pro/i.test(lower) || /playstation\s+4\s+pro/i.test(lower)) model = "PlayStation 4 Pro";
  else if (/ps4|playstation\s+4/i.test(lower)) model = "PlayStation 4";
  else if (/dualsense\s+edge/i.test(lower)) model = "DualSense Edge";
  else if (/dualsense/i.test(lower)) model = "DualSense";
  else if (/dualshock/i.test(lower)) model = "DualShock 4";

  return { brand, model, version, storageGb };
}

function normalizeStorageGb(value: string): number | undefined {
  const tb = value.match(/\b(\d+(?:\.\d+)?)\s*tb\b/i);
  if (tb) return Math.round(Number(tb[1]) * 1024);
  const gb = [...value.matchAll(/\b(\d{2,4})\s*gb\b/gi)].map((m) => Number(m[1])).filter((n) => n >= 8);
  if (gb.length) return Math.max(...gb);
  return undefined;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Validation ─────────────────────────────────────────────────────────────

async function validateSnapshot(snapshot: PcshopConsolesSnapshot): Promise<ValidationReport> {
  const urls = new Set<string>();
  const keys = new Set<string>();
  let duplicateUniqueKeyCount = 0;
  let missingTitleCount = 0;
  let missingPriceCount = 0;
  let missingImageCount = 0;
  let nonConsoleProductCount = 0;
  let invalidStoreCount = 0;
  let invalidSourceCount = 0;
  let invalidCategoryCount = 0;
  let invalidPcshopUrlCount = 0;

  for (const product of snapshot.products) {
    if (urls.has(product.productUrl)) continue;
    urls.add(product.productUrl);
    if (keys.has(product.uniqueKey)) duplicateUniqueKeyCount += 1;
    keys.add(product.uniqueKey);
    if (!product.originalTitle) missingTitleCount += 1;
    if (product.currentPriceGel == null) missingPriceCount += 1;
    if (!product.imageUrl) missingImageCount += 1;
    if (!isPlayStationListing(product)) nonConsoleProductCount += 1;
    if (product.store !== STORE) invalidStoreCount += 1;
    if (product.source !== SOURCE) invalidSourceCount += 1;
    if (product.category !== SOURCE_CATEGORY || product.fasmetriCategorySlug !== FASMETRI_CATEGORY) invalidCategoryCount += 1;
    if (!isPcshopUrl(product.productUrl)) invalidPcshopUrlCount += 1;
  }

  const oldActiveCount = await activePcshopConsoleCount();
  const hardFailures: string[] = [];
  const warnings: string[] = [];
  const productCount = snapshot.products.length;

  if (nonConsoleProductCount) hardFailures.push(`${nonConsoleProductCount} non-PlayStation products detected.`);
  if (duplicateUniqueKeyCount) hardFailures.push(`${duplicateUniqueKeyCount} duplicate unique keys detected.`);
  if (invalidPcshopUrlCount) hardFailures.push(`${invalidPcshopUrlCount} product URLs are not from pcshop.ge.`);
  if (invalidStoreCount) hardFailures.push(`${invalidStoreCount} products have an invalid store.`);
  if (invalidSourceCount) hardFailures.push(`${invalidSourceCount} products have an invalid source.`);
  if (invalidCategoryCount) hardFailures.push(`${invalidCategoryCount} products have an invalid category.`);
  if (!snapshot.listing.seeMoreExhausted) hardFailures.push("PCShop listing pages were not fully exhausted.");
  if (oldActiveCount > 0 && productCount < Math.floor(oldActiveCount * LOW_COUNT_RATIO)) {
    hardFailures.push(`New scraped count ${productCount} is suspiciously lower than old active count ${oldActiveCount}.`);
  }
  if (missingPriceCount > Math.max(5, Math.ceil(productCount * MAX_MISSING_PRICE_RATIO))) {
    hardFailures.push(`${missingPriceCount} products are missing prices.`);
  }

  if (missingImageCount) warnings.push(`${missingImageCount} products are missing images.`);
  if (snapshot.failedDetailUrls.length) warnings.push(`${snapshot.failedDetailUrls.length} detail pages failed.`);

  return {
    totalListingProductsDiscovered: snapshot.listing.productsCountFromApi,
    totalUniqueProductUrls: productCount,
    totalDetailPagesAttempted: 0,
    totalDetailPagesSucceeded: 0,
    totalDetailPagesFailed: snapshot.failedDetailUrls.length,
    duplicateUrlCount: snapshot.listing.duplicateUrlCount,
    missingTitleCount,
    missingPriceCount,
    missingImageCount,
    nonConsoleProductCount,
    invalidStoreCount,
    invalidSourceCount,
    invalidCategoryCount,
    invalidPcshopUrlCount,
    duplicateUniqueKeyCount,
    oldActivePcshopConsoleCount: oldActiveCount,
    newScrapedPcshopConsoleCount: productCount,
    promotionStatus: "not_requested",
    hardFailures,
    warnings,
  };
}

// ── Promotion ──────────────────────────────────────────────────────────────

async function promoteSnapshot(snapshot: PcshopConsolesSnapshot): Promise<PromotionReport> {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  await assertSyncSchemaReady();
  const shop = await db.shop.upsert({
    where: { slug: STORE },
    update: { name: "PCShop", baseUrl: STORE_BASE_URL, enabled: true, needsConfiguration: false },
    create: { slug: STORE, name: "PCShop", baseUrl: STORE_BASE_URL, enabled: true, needsConfiguration: false },
  });
  const category = await db.category.upsert({
    where: { slug: FASMETRI_CATEGORY },
    update: {},
    create: { slug: FASMETRI_CATEGORY, nameKa: "Gaming", nameEn: "Gaming" },
  });

  const existingOffers = await existingOfferStateByUrl(shop.id);
  const liveUrls = new Set(snapshot.products.map((item) => item.productUrl));
  let totalImportedOrUpserted = 0;
  let totalUpdatedPrices = 0;
  let totalNewProducts = 0;
  let skippedCount = 0;
  let priceAnomalyCount = 0;

  for (const item of snapshot.products) {
    if (item.currentPriceGel == null || !item.originalTitle) {
      skippedCount += 1;
      await upsertRawOffer(shop.id, item, undefined);
      continue;
    }

    const currentPriceGel = item.currentPriceGel;
    const existing = existingOffers.get(item.productUrl);
    const existingPrice = existing ? Number(existing.currentPrice) : null;
    const existingOldPrice = existing?.oldPrice == null ? null : Number(existing.oldPrice);
    const priceAnomalous = existingPrice != null && isAnomalousPriceChange(existingPrice, currentPriceGel);
    if (priceAnomalous) {
      priceAnomalyCount += 1;
      console.warn(
        `[pcshop-consoles] Price anomaly: "${item.originalTitle}" ${existingPrice} -> ${currentPriceGel} GEL, keeping old price (${item.productUrl})`,
      );
      await recordPriceAnomaly(db, {
        store: STORE,
        category: SOURCE_CATEGORY,
        offerUrl: item.productUrl,
        title: item.originalTitle,
        previousPrice: existingPrice,
        newPrice: currentPriceGel,
      });
    }
    const priceChanged = !priceAnomalous && (existingPrice !== currentPriceGel || existingOldPrice !== item.oldPriceGel);
    const saleDetectedAt = item.discountPercent > 0 ? existing?.saleDetectedAt ?? new Date() : null;
    const resolvedAvailability = item.availability;

    const rawOffer = await upsertRawOffer(shop.id, item, undefined);
    let offerExternalId: string | null = item.externalId ?? null;

    const runTransaction = () =>
      db.$transaction(async (tx) => {
        const product = await upsertStandaloneProduct(tx, category.id, item, existing?.id);
        const offer = await tx.productOffer.upsert({
          where: { shopId_url: { shopId: shop.id, url: item.productUrl } },
          update: {
            productId: product.id,
            rawOfferId: rawOffer.id,
            externalId: offerExternalId,
            title: item.originalTitle,
            canonicalKey: item.uniqueKey,
            productIdentity: jsonValue(productIdentityFor(item)),
            matchStatus: "CONFIRMED",
            matchConfidence: 100,
            verificationStatus: "CONFIRMED",
            previousSeenPrice: priceChanged && existingPrice != null ? existingPrice : undefined,
            currentPrice: priceAnomalous ? undefined : currentPriceGel,
            oldPrice: priceAnomalous ? undefined : item.oldPriceGel,
            discountAmount: priceAnomalous ? undefined : item.discountAmountGel,
            discountPercent: priceAnomalous ? undefined : item.discountPercent,
            isOnSale: priceAnomalous ? undefined : item.discountPercent > 0,
            saleDetectedAt: priceAnomalous ? undefined : saleDetectedAt,
            availability: resolvedAvailability,
            imageUrl: item.imageUrl,
            lastSeenAt: new Date(item.scrapedAt),
            lastCheckedAt: new Date(),
            lastPriceChangedAt: priceChanged ? new Date() : undefined,
            isActive: true,
            missedSyncCount: 0,
            possiblyInactiveAt: null,
            inactiveAt: null,
          },
          create: {
            shopId: shop.id,
            productId: product.id,
            rawOfferId: rawOffer.id,
            externalId: offerExternalId,
            url: item.productUrl,
            title: item.originalTitle,
            canonicalKey: item.uniqueKey,
            productIdentity: jsonValue(productIdentityFor(item)),
            matchStatus: "CONFIRMED",
            matchConfidence: 100,
            verificationStatus: "CONFIRMED",
            currentPrice: currentPriceGel,
            oldPrice: item.oldPriceGel,
            discountAmount: item.discountAmountGel,
            discountPercent: item.discountPercent,
            isOnSale: item.discountPercent > 0,
            saleDetectedAt: item.discountPercent > 0 ? new Date() : undefined,
            availability: item.availability,
            imageUrl: item.imageUrl,
            firstSeenAt: new Date(item.scrapedAt),
            lastSeenAt: new Date(item.scrapedAt),
            lastCheckedAt: new Date(),
            lastPriceChangedAt: new Date(),
            isActive: true,
          },
        });

        if (priceChanged || !existing) {
          await tx.priceHistory.create({
            data: {
              offerId: offer.id,
              price: currentPriceGel,
              oldPrice: item.oldPriceGel,
              availability: resolvedAvailability,
              capturedAt: new Date(item.scrapedAt),
            },
          });
        }
      });

    try {
      await runTransaction();
    } catch (err) {
      if (isExternalIdConflict(err) && offerExternalId !== null) {
        offerExternalId = null;
        await runTransaction();
      } else {
        throw err;
      }
    }

    totalImportedOrUpserted += 1;
    if (!existing) totalNewProducts += 1;
    if (priceChanged) totalUpdatedPrices += 1;
  }

  const removalResult = await markMissingOffers(existingOffers, liveUrls);
  await db.shop.update({
    where: { id: shop.id },
    data: { lastScrapedAt: new Date(), lastIngestedAt: new Date(), ingestionStatus: "SUCCESS" },
  });

  return {
    totalImportedOrUpserted,
    totalUpdatedPrices,
    totalNewProducts,
    totalPossiblyRemovedProducts: removalResult.possiblyRemoved,
    totalMarkedInactive: removalResult.markedInactive,
    skippedCount,
    priceAnomalyCount,
  };
}

async function upsertStandaloneProduct(tx: Prisma.TransactionClient, categoryId: string, item: StagedPcshopConsole, existingOfferId?: string) {
  if (existingOfferId) {
    const existingOffer = await tx.productOffer.findUnique({ where: { id: existingOfferId }, select: { productId: true } });
    if (existingOffer?.productId) {
      return tx.product.update({
        where: { id: existingOffer.productId },
        data: productData(categoryId, item),
      });
    }
  }

  const existing = await tx.product.findFirst({ where: { canonicalKey: item.uniqueKey } });
  if (existing) return tx.product.update({ where: { id: existing.id }, data: productData(categoryId, item) });

  const slug = stableProductSlug(item);
  try {
    return await tx.product.create({
      data: {
        ...productData(categoryId, item),
        slug,
      } as Prisma.ProductUncheckedCreateInput,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return tx.product.create({
        data: {
          ...productData(categoryId, item),
          slug: `${slug}-${stableHash(item.uniqueKey).slice(0, 6)}`,
        } as Prisma.ProductUncheckedCreateInput,
      });
    }
    throw error;
  }
}

function productData(categoryId: string, item: StagedPcshopConsole) {
  return {
    name: item.originalTitle,
    normalizedName: normalizeProductName(item.originalTitle),
    canonicalKey: item.uniqueKey,
    productIdentity: jsonValue(productIdentityFor(item)),
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    imageUrl: item.imageUrl,
    categoryId,
    categoryConfidence: 100,
    categoryNeedsReview: false,
    categorySuggestedSlug: FASMETRI_CATEGORY,
    categoryReason: "PCShop PlayStation search-only sync validated this source URL.",
    categoryMatchedRules: jsonValue(["pcshop-playstation-search"]),
    categorySourceSignals: jsonValue({
      store: STORE,
      sourceCategory: SOURCE_CATEGORY,
      sourceUrl: LISTING_API_URL,
      productUrl: item.productUrl,
    }),
    isPublic: true,
    needsReview: false,
    archivedAt: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;
}

async function upsertRawOffer(shopId: string, item: StagedPcshopConsole, tx?: Prisma.TransactionClient) {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  const client = tx ?? db;
  let externalId: string | null = item.externalId ?? null;
  const data = {
    externalId,
    originalTitle: item.originalTitle,
    originalImageUrl: item.imageUrl,
    rawPrice: item.currentPriceGel,
    rawOldPrice: item.oldPriceGel,
    rawDiscount: item.discountPercent,
    availability: item.availability,
    rawCategory: SOURCE_CATEGORY,
    sourceCategory: SOURCE_CATEGORY,
    breadcrumbs: jsonValue([SOURCE_CATEGORY, item.productUrl]),
    sourceBreadcrumbs: jsonValue([SOURCE_CATEGORY, item.productUrl]),
    description: stringValue((item.rawListingData as JsonRecord).short_description as unknown),
    imageAlt: undefined,
    rawSpecsJson: jsonValue(rawSpecsPayload(item)),
    importBatchId: `pcshop-consoles:${item.scrapedAt.slice(0, 10)}`,
    storeKey: STORE,
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    normalizedTitle: normalizeProductTitle(item.originalTitle),
    cleanTitle: removeNoiseWords(item.originalTitle),
    canonicalKey: item.uniqueKey,
    productIdentity: jsonValue(productIdentityFor(item)),
    categorySlug: FASMETRI_CATEGORY,
    categoryConfidence: 100,
    categoryNeedsReview: false,
    status: "NORMALIZED" as const,
    scrapedAt: new Date(item.scrapedAt),
    processedAt: new Date(),
    errorMessage: null,
  };

  const upsert = () =>
    client.rawOffer.upsert({
      where: { shopId_originalUrl: { shopId, originalUrl: item.productUrl } },
      update: data,
      create: {
        shopId,
        originalUrl: item.productUrl,
        ...data,
      },
    });

  try {
    return await upsert();
  } catch (error) {
    if (isExternalIdConflict(error) && externalId !== null) {
      externalId = null;
      data.externalId = null;
      return upsert();
    }
    throw error;
  }
}

async function markMissingOffers(existingOffers: Map<string, ExistingOfferState>, liveUrls: Set<string>) {
  if (!db) return { possiblyRemoved: 0, markedInactive: 0 };
  let possiblyRemoved = 0;
  let markedInactive = 0;

  for (const offer of existingOffers.values()) {
    if (liveUrls.has(offer.url)) continue;
    possiblyRemoved += 1;
    const missedSyncCount = offer.missedSyncCount + 1;
    const now = new Date();
    const inactive = missedSyncCount >= INACTIVE_MISS_THRESHOLD;
    await db.productOffer.update({
      where: { id: offer.id },
      data: {
        availability: OfferAvailability.OUT_OF_STOCK,
        lastCheckedAt: now,
        missedSyncCount,
        possiblyInactiveAt: offer.possiblyInactiveAt ?? now,
        isActive: inactive ? false : offer.isActive,
        inactiveAt: inactive ? now : offer.isActive ? null : undefined,
        matchStatus: inactive ? "REJECTED" : undefined,
        verificationStatus: inactive ? "REJECTED" : undefined,
      },
    });
    if (offer.rawOfferId) {
      await db.rawOffer.update({
        where: { id: offer.rawOfferId },
        data: {
          status: inactive ? "EXCLUDED" : "NORMALIZED",
          errorMessage: inactive
            ? `Not present in ${INACTIVE_MISS_THRESHOLD} consecutive PCShop console syncs.`
            : "Possibly removed: not present in latest PCShop PlayStation listing.",
          processedAt: now,
        },
      });
    }
    if (inactive) markedInactive += 1;
  }

  return { possiblyRemoved, markedInactive };
}

async function activePcshopConsoleCount() {
  if (!db) return 0;
  const where = {
    shop: { slug: STORE },
    product: {
      categoryNeedsReview: false,
      OR: [{ categorySuggestedSlug: FASMETRI_CATEGORY }, { category: { slug: FASMETRI_CATEGORY } }],
    },
    url: { contains: "pcshop.ge" },
  } satisfies Prisma.ProductOfferWhereInput;
  try {
    return await db.productOffer.count({ where: { ...where, isActive: true } });
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return db.productOffer.count({ where });
  }
}

async function existingOfferStateByUrl(shopId: string) {
  if (!db) return new Map<string, ExistingOfferState>();
  const offers = await db.productOffer.findMany({
    where: {
      shopId,
      product: {
        categoryNeedsReview: false,
        OR: [{ categorySuggestedSlug: FASMETRI_CATEGORY }, { category: { slug: FASMETRI_CATEGORY } }],
      },
      url: { contains: "pcshop.ge" },
    },
    select: {
      id: true,
      rawOfferId: true,
      url: true,
      currentPrice: true,
      oldPrice: true,
      availability: true,
      isOnSale: true,
      saleDetectedAt: true,
      missedSyncCount: true,
      possiblyInactiveAt: true,
      isActive: true,
    },
  });
  return new Map(offers.map((offer) => [offer.url, offer]));
}

// ── Schema guard ───────────────────────────────────────────────────────────

async function assertSyncSchemaReady() {
  if (!db) return;
  try {
    await db.productOffer.findFirst({ select: { id: true, isActive: true, missedSyncCount: true }, take: 1 });
  } catch (error) {
    if (isMissingColumnError(error)) {
      throw new Error("PCShop console sync schema is not deployed. Run npm run db:deploy before promotion.");
    }
    throw error;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isPlayStationListing(product: StagedPcshopConsole) {
  return /playstation|ps5|ps4|dualsense|dualshock/i.test(product.originalTitle);
}

function isPcshopUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname === "pcshop.ge";
  } catch {
    return false;
  }
}

function stableProductSlug(item: StagedPcshopConsole) {
  const base = slugifyProduct(item.originalTitle);
  const id = item.externalId ?? stableHash(item.productUrl).slice(0, 8);
  return `${base}-pcshop-${id}`;
}

function stableHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function rawSpecsPayload(item: StagedPcshopConsole) {
  return {
    source: SOURCE,
    sourceCategory: SOURCE_CATEGORY,
    listingPage: item.listingPage,
    listing: {
      productUrl: item.productUrl,
      productCode: item.productCode,
      currentPriceGel: item.currentPriceGel,
      oldPriceGel: item.oldPriceGel,
      discountAmountGel: item.discountAmountGel,
      installmentPriceGel: item.installmentPriceGel,
      availability: item.availability,
      isOnSale: item.discountPercent > 0,
    },
    allImages: item.allImages,
    rawListingData: item.rawListingData,
    rawSpecs: item.rawSpecs,
    normalizedSpecs: item.normalizedSpecs,
    detail: {
      attempted: item.detailAttempted,
      succeeded: item.detailSucceeded,
    },
  };
}

function productIdentityFor(item: StagedPcshopConsole) {
  return {
    productType: "gaming_console",
    categorySlug: FASMETRI_CATEGORY,
    sourceCategory: SOURCE_CATEGORY,
    source: SOURCE,
    store: STORE,
    uniqueKey: item.uniqueKey,
    externalId: item.externalId,
    productCode: item.productCode,
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    version: item.normalizedSpecs.version,
    storageGb: item.normalizedSpecs.storageGb,
    canonicalKey: item.uniqueKey,
    normalizedTitle: normalizeProductTitle(item.originalTitle),
    cleanTitle: removeNoiseWords(item.originalTitle),
    specs: item.normalizedSpecs,
  };
}

function jsonRecord(value: unknown): JsonRecord {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonRecord;
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function userAgent() {
  return process.env.SCRAPER_USER_AGENT ?? USER_AGENT;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: { headers: Record<string, string>; timeoutMs: number }) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: options.headers,
        cache: "no-store",
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) await sleep(750 * 2 ** attempt);
    }
  }
  throw lastError;
}

function readSnapshot(rawFile?: string): PcshopConsolesSnapshot {
  const file = rawFile ? resolve(rawFile) : resolve(defaultRawDir(), "pcshop-consoles-sync-latest.json");
  if (!existsSync(file)) throw new Error(`Raw snapshot does not exist: ${file}`);
  return JSON.parse(readFileSync(file, "utf8")) as PcshopConsolesSnapshot;
}

function writeSnapshot(snapshot: PcshopConsolesSnapshot, rawDir?: string) {
  const dir = writableDir(rawDir ?? defaultRawDir());
  const timestamp = timestampForFile(new Date());
  const file = join(dir, `pcshop-consoles-sync-${timestamp}.json`);
  const latest = join(dir, "pcshop-consoles-sync-latest.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2));
  writeFileSync(latest, JSON.stringify({ ...snapshot, rawFile: file }, null, 2));
  return file;
}

function writeReport(report: PcshopConsoleSyncReport, reportDir?: string) {
  const dir = writableDir(reportDir ?? defaultReportDir());
  const timestamp = timestampForFile(new Date(report.finishedAt));
  const reportFile = join(dir, `pcshop-consoles-sync-${timestamp}.json`);
  const latestReportFile = join(dir, "pcshop-consoles-sync-latest.json");
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  writeFileSync(latestReportFile, JSON.stringify({ ...report, reportFile, latestReportFile }, null, 2));
  return { reportFile, latestReportFile };
}

function defaultRawDir() {
  return join(".codex-logs", "pcshop-consoles", "raw");
}

function defaultReportDir() {
  return "reports";
}

function writableDir(preferred: string) {
  try {
    mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const fallback = join(tmpdir(), "fasmetri-pcshop-console-sync", preferred.replace(/[:\\/]+/g, "-"));
    mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function timestampForFile(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function withSyncLock<T>(callback: () => Promise<T>) {
  const lockPath = join(".codex-logs", "pcshop-consoles-sync.lock");
  acquireFileLock(lockPath);
  let dbLocked = false;
  try {
    if (db) {
      const rows = await db.$queryRawUnsafe<Array<{ locked: boolean }>>(`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS locked`);
      dbLocked = Boolean(rows[0]?.locked);
      if (!dbLocked) throw new Error("Another PCShop console sync is already running.");
    }
    return await callback();
  } finally {
    if (db && dbLocked) await db.$queryRawUnsafe(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
    releaseFileLock(lockPath);
  }
}

function acquireFileLock(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    const current = JSON.parse(readFileSync(path, "utf8")) as { startedAt?: string };
    const startedAt = current.startedAt ? Date.parse(current.startedAt) : 0;
    if (Number.isFinite(startedAt) && Date.now() - startedAt < 6 * 60 * 60 * 1000) {
      throw new Error("Another PCShop console sync lock is active.");
    }
    renameSync(path, `${path}.stale-${Date.now()}`);
  }
  writeFileSync(path, JSON.stringify({ startedAt: new Date().toISOString() }, null, 2));
}

function releaseFileLock(path: string) {
  try {
    rmSync(path, { force: true });
  } catch {
    // Best-effort cleanup.
  }
}

function isExternalIdConflict(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return JSON.stringify(error.meta ?? "").includes("externalId");
  }
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("externalId");
}

function isMissingColumnError(error: unknown) {
  const text = errorMessage(error).toLowerCase();
  return text.includes("column") && (text.includes("does not exist") || text.includes("not available"));
}
