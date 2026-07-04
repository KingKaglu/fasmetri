import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { OfferAvailability, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAnomalousPriceChange, recordPriceAnomaly } from "@/server/sync/priceAnomalyGuard";
import { normalizeProductName, slugifyProduct } from "@/lib/matching";
import { normalizeProductTitle, removeNoiseWords } from "@/lib/productNormalization";

const STORE = "ee";
const SOURCE = "elite-electronics";
const SOURCE_CATEGORY = "playstation";
const FASMETRI_CATEGORY = "gaming";
const CATEGORY_ID = 173;
const CATEGORY_URL = "https://ee.ge/en/playstation-5-c173t";
const CATEGORY_PAGE_SIZE = 16;
const USER_AGENT = "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)";
const PAGE_LIMIT = CATEGORY_PAGE_SIZE;
const PRICE_SYNC_DETAIL_CONCURRENCY = 2;
const FULL_DETAIL_CONCURRENCY = 2;
const REQUEST_TIMEOUT_MS = 25_000;
const DETAIL_TIMEOUT_MS = 35_000;
const MAX_RETRIES = 2;
const MIN_REQUEST_DELAY_MS = 450;
const MIN_DETAIL_DELAY_MS = 1_250;
const LOW_COUNT_RATIO = 0.7;
const MAX_MISSING_PRICE_RATIO = 0.1;
const INACTIVE_MISS_THRESHOLD = 3;
// Lock IDs in use: 85520260605 (zoommer-phones), 53120260605 (zoommer-laptops),
//                  37720260605 (ee-phones), 5820260605 (ee-laptops),
//                  90000000001 (pcshop-consoles), 90000000002 (zoommer-consoles)
const ADVISORY_LOCK_ID = 90000000003;

// Filter: only genuine PS5/PlayStation/DualSense gear
const PS5_FILTER = /playstation|ps5|dualsense|dualshock|ps4/i;
// Exclude game software — the consoles category is hardware only.
const GAME_SOFTWARE_FILTER = /\bgames?\b/i;

type JsonRecord = Record<string, unknown>;

export type EeConsoleSyncMode = "discover" | "full" | "prices" | "validate" | "promote";

export type EeConsoleSyncOptions = {
  mode: EeConsoleSyncMode;
  promote?: boolean;
  rawFile?: string;
  reportDir?: string;
  rawDir?: string;
  detailLimit?: number;
  dryRun?: boolean;
};

type EEListingProduct = {
  id?: number | string;
  name?: string;
  barCode?: string | null;
  price?: number | string | null;
  previousPrice?: number | string | null;
  discountAmount?: number | string | null;
  discountPercent?: number | string | null;
  imageUrl?: string | null;
  images?: string[] | null;
  isInStock?: boolean | null;
  storageQuantity?: number | string | null;
  disableBuyButton?: boolean | null;
  categoryId?: number | string | null;
  categoryIds?: unknown;
  parentCategoryName?: string | null;
  categoryName?: string | null;
  route?: string | null;
  routeEn?: string | null;
  routeGe?: string | null;
  routeRu?: string | null;
  brandName?: string | null;
  breadcrumbs?: unknown;
  imageAlt?: string | null;
};

type EECategoryPage = {
  productsCount?: number;
  products?: EEListingProduct[];
  success?: boolean;
};

type EESpecValue = {
  groupName: string;
  specificationName: string;
  specificationMeaning: string;
  isColor?: boolean;
  colorValue?: string | null;
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

export type StagedEeConsole = {
  store: typeof STORE;
  source: typeof SOURCE;
  sourceCategory: typeof SOURCE_CATEGORY;
  category: typeof SOURCE_CATEGORY;
  fasmetriCategorySlug: typeof FASMETRI_CATEGORY;
  uniqueKey: string;
  eeProductId?: string;
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
  installmentPriceGel: number | null;
  availability: OfferAvailability;
  scrapedAt: string;
  listingPage: number;
  rawListingData: JsonRecord;
  detailAttempted: boolean;
  detailSucceeded: boolean;
  detailError?: string;
  allImages: string[];
  rawSpecs: JsonRecord;
  normalizedSpecs: NormalizedConsoleSpecs;
};

export type EeConsolesSnapshot = {
  version: 1;
  mode: "discover" | "full" | "prices";
  sourceUrl: typeof CATEGORY_URL;
  categoryId: typeof CATEGORY_ID;
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
  products: StagedEeConsole[];
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
  invalidEEUrlCount: number;
  duplicateUniqueKeyCount: number;
  oldActiveEeConsoleCount: number;
  newScrapedEeConsoleCount: number;
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

export type EeConsoleSyncReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  mode: EeConsoleSyncMode;
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

type ExistingRawState = {
  originalTitle: string;
  rawSpecsJson: unknown;
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

export async function runEeConsoleSync(options: EeConsoleSyncOptions): Promise<EeConsoleSyncReport> {
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
    const report: EeConsoleSyncReport = {
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
      throw new Error(`EE console sync validation failed: ${validation.hardFailures.join("; ")}`);
    }
    return report;
  });
}

async function scrapeSnapshot(options: EeConsoleSyncOptions): Promise<EeConsolesSnapshot> {
  const mode = options.mode === "full" ? "full" : options.mode === "prices" ? "prices" : "discover";
  const startedAt = new Date().toISOString();
  const listing = await discoverListing();
  const existing = mode === "prices" ? await existingRawStateByUrl(listing.products.map((item) => item.productUrl)) : new Map<string, ExistingRawState>();

  const detailTargets = listing.products.filter((item) => {
    if (mode === "discover") return false;
    if (mode === "full") return true;
    const current = existing.get(item.productUrl);
    if (!current) return true;
    if (current.originalTitle !== item.originalTitle) return true;
    const specs = readRawSpecs(current.rawSpecsJson);
    return !specs || Object.keys(specs.normalizedSpecs ?? {}).length === 0;
  });

  const limitedTargets = options.detailLimit ? detailTargets.slice(0, options.detailLimit) : detailTargets;
  const details = new Map<string, Awaited<ReturnType<typeof scrapeDetail>>>();
  const failedDetailUrls: EeConsolesSnapshot["failedDetailUrls"] = [];

  await asyncPool(limitedTargets, mode === "full" ? FULL_DETAIL_CONCURRENCY : PRICE_SYNC_DETAIL_CONCURRENCY, async (item) => {
    await sleep(MIN_DETAIL_DELAY_MS);
    const result = await scrapeDetail(item);
    details.set(item.productUrl, result);
    if (!result.detailSucceeded && result.detailError) failedDetailUrls.push({ url: item.productUrl, reason: result.detailError });
  });

  const products = listing.products.map((item) => mergeDetail(item, details.get(item.productUrl), existing.get(item.productUrl)));
  const snapshot: EeConsolesSnapshot = {
    version: 1,
    mode,
    sourceUrl: CATEGORY_URL,
    categoryId: CATEGORY_ID,
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
      seeMoreExhausted: listing.seeMoreExhausted,
    },
    products,
    failedDetailUrls,
  };
  return snapshot;
}

async function discoverListing() {
  const firstPage = await fetchCategoryPage(1);
  const productsCountFromApi = firstPage.productsCount ?? firstPage.products?.length ?? 0;
  const totalPagesExpected = Math.max(1, Math.ceil(productsCountFromApi / PAGE_LIMIT));
  const allProducts: Array<{ product: EEListingProduct; page: number }> = (firstPage.products ?? []).map((product) => ({ product, page: 1 }));
  const failedListingUrls: string[] = [];
  const seenListingKeys = new Set((firstPage.products ?? []).map(listingProductKey));
  let totalBatchesLoaded = firstPage.products?.length ? 1 : 0;
  let seeMoreExhausted = false;

  for (let page = 2; page <= Math.max(totalPagesExpected + 1, 2); page += 1) {
    await sleep(MIN_REQUEST_DELAY_MS);
    try {
      const result = await fetchCategoryPage(page);
      const pageProducts = result.products ?? [];
      const newProducts = pageProducts.filter((product) => {
        const key = listingProductKey(product);
        if (!key || seenListingKeys.has(key)) return false;
        seenListingKeys.add(key);
        return true;
      });

      if (pageProducts.length === 0 || newProducts.length === 0) {
        seeMoreExhausted = page > totalPagesExpected;
        break;
      }

      totalBatchesLoaded += 1;
      allProducts.push(...pageProducts.map((product) => ({ product, page })));
    } catch (error) {
      failedListingUrls.push(`${categoryPageUrl(page)}: ${errorMessage(error)}`);
    }
  }

  const unique = new Map<string, StagedEeConsole>();
  let duplicateUrlCount = 0;
  for (const item of allProducts) {
    // Filter to genuine PS5/PlayStation/DualSense hardware (exclude game software)
    const listingName = String(item.product.name ?? "");
    if (!PS5_FILTER.test(listingName) || GAME_SOFTWARE_FILTER.test(listingName)) continue;
    const staged = stagedFromListing(item.product, item.page);
    if (!staged.productUrl) continue;
    if (unique.has(staged.productUrl)) {
      duplicateUrlCount += 1;
      continue;
    }
    unique.set(staged.productUrl, staged);
  }

  return {
    firstBatchCount: firstPage.products?.length ?? 0,
    totalBatchesLoaded,
    totalPagesExpected,
    productsCountFromApi,
    products: [...unique.values()],
    duplicateUrlCount,
    failedListingUrls,
    seeMoreExhausted: seeMoreExhausted && failedListingUrls.length === 0,
  };
}

function listingProductKey(product: EEListingProduct) {
  if (product.id != null) return String(product.id);
  const route = routeForProduct(product);
  if (!route) return "";
  return route.match(/-p(\d+)\/?$/i)?.[1] ?? route;
}

function listingAvailability(product: EEListingProduct) {
  if (product.isInStock === true) return OfferAvailability.IN_STOCK;
  if (product.isInStock === false) return OfferAvailability.OUT_OF_STOCK;
  const storageQuantity = integerValue(product.storageQuantity);
  if (storageQuantity != null) return storageQuantity > 0 && !product.disableBuyButton ? OfferAvailability.IN_STOCK : OfferAvailability.OUT_OF_STOCK;
  if (product.disableBuyButton === true) return OfferAvailability.OUT_OF_STOCK;
  return OfferAvailability.UNKNOWN;
}

function stagedFromListing(product: EEListingProduct, listingPage: number): StagedEeConsole {
  const route = routeForProduct(product);
  const productUrl = route ? new URL(route.replace(/^\//, ""), "https://ee.ge/en/").toString() : "";
  const title = String(product.name ?? "").trim();
  const currentPriceGel = normalizeGelPrice(product.price);
  const oldPriceCandidate = normalizeGelPrice(product.previousPrice);
  const oldPriceGel = oldPriceCandidate != null && currentPriceGel != null && oldPriceCandidate > currentPriceGel ? oldPriceCandidate : null;
  const discountAmountGel = normalizeGelPrice(product.discountAmount) ?? discountAmount(currentPriceGel, oldPriceGel);
  const normalizedSpecs = normalizeConsoleSpecs({ title, listing: product, rawSpecValues: [] });
  const id = product.id == null ? productIdFromUrl(productUrl) : String(product.id);
  const uniqueKey = id ? `${STORE}:${SOURCE_CATEGORY}:${id}` : `${STORE}:${SOURCE_CATEGORY}:${stableHash(productUrl)}`;
  const imageUrl = stringValue(product.imageUrl);

  return {
    store: STORE,
    source: SOURCE,
    sourceCategory: SOURCE_CATEGORY,
    category: SOURCE_CATEGORY,
    fasmetriCategorySlug: FASMETRI_CATEGORY,
    uniqueKey,
    eeProductId: id ?? undefined,
    productCode: stringValue(product.barCode),
    sku: stringValue(product.barCode),
    originalTitle: title,
    brand: normalizedSpecs.brand,
    productUrl,
    canonicalUrl: productUrl,
    imageUrl,
    currentPriceGel,
    oldPriceGel,
    discountAmountGel,
    discountPercent: integerValue(product.discountPercent) ?? discountPercent(currentPriceGel, oldPriceGel),
    installmentPriceGel: null,
    availability: listingAvailability(product),
    scrapedAt: new Date().toISOString(),
    listingPage,
    rawListingData: jsonRecord(product),
    detailAttempted: false,
    detailSucceeded: false,
    allImages: imageUrl ? [imageUrl] : [],
    rawSpecs: {},
    normalizedSpecs,
  };
}

async function scrapeDetail(item: StagedEeConsole) {
  try {
    const html = await fetchText(item.productUrl, DETAIL_TIMEOUT_MS);
    const rawNextData = extractNextData(html);
    const product = readPath<JsonRecord>(rawNextData, ["props", "pageProps", "initialProductData", "product"]) ?? {};
    const share =
      readPath<JsonRecord>(rawNextData, ["props", "pageProps", "initialSharePageData"]) ??
      readPath<JsonRecord>(rawNextData, ["props", "pageProps", "sharePageData"]) ??
      {};
    const rawSpecValues = flattenSpecValues(product);
    const normalizedSpecs = normalizeConsoleSpecs({
      title: stringValue(product.name) ?? item.originalTitle,
      listing: item.rawListingData,
      detailProduct: product,
      share,
      rawSpecValues,
    });
    const images = allImageUrls(product, share, item.imageUrl);
    return {
      detailAttempted: true,
      detailSucceeded: true,
      allImages: images,
      imageUrl: images[0] ?? item.imageUrl,
      rawSpecs: {
        specificationGroup: product.specificationGroup,
        mainSpecification: product.mainSpecification,
        keySpecification: product.keySpecification,
        flattened: rawSpecValues,
      } as JsonRecord,
      normalizedSpecs,
      canonicalUrl: item.productUrl,
    };
  } catch (error) {
    return {
      detailAttempted: true,
      detailSucceeded: false,
      detailError: errorMessage(error),
      allImages: item.allImages,
      imageUrl: item.imageUrl,
      rawSpecs: item.rawSpecs,
      normalizedSpecs: item.normalizedSpecs,
      canonicalUrl: item.productUrl,
    };
  }
}

function mergeDetail(
  item: StagedEeConsole,
  detail?: Awaited<ReturnType<typeof scrapeDetail>>,
  existing?: ExistingRawState,
): StagedEeConsole {
  if (detail) {
    return {
      ...item,
      imageUrl: detail.imageUrl,
      canonicalUrl: detail.canonicalUrl,
      detailAttempted: detail.detailAttempted,
      detailSucceeded: detail.detailSucceeded,
      detailError: detail.detailError,
      allImages: detail.allImages,
      rawSpecs: detail.rawSpecs,
      normalizedSpecs: { ...item.normalizedSpecs, ...detail.normalizedSpecs },
      brand: detail.normalizedSpecs.brand ?? item.brand,
    };
  }

  const prior = existing ? readRawSpecs(existing.rawSpecsJson) : null;
  if (!prior) return item;
  return {
    ...item,
    allImages: prior.allImages?.length ? prior.allImages : item.allImages,
    rawSpecs: prior.rawSpecs ?? item.rawSpecs,
    normalizedSpecs: { ...item.normalizedSpecs, ...(prior.normalizedSpecs ?? {}) },
    brand: prior.normalizedSpecs?.brand ?? item.brand,
  };
}

async function validateSnapshot(snapshot: EeConsolesSnapshot): Promise<ValidationReport> {
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
  let invalidEEUrlCount = 0;

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
    if (!isEEUrl(product.productUrl)) invalidEEUrlCount += 1;
  }

  const oldActiveEeConsoleCount = await activeEeConsoleCount();
  const hardFailures: string[] = [];
  const warnings: string[] = [];
  const productCount = snapshot.products.length;

  if (nonConsoleProductCount) hardFailures.push(`${nonConsoleProductCount} non-PlayStation products detected.`);
  if (duplicateUniqueKeyCount) hardFailures.push(`${duplicateUniqueKeyCount} duplicate unique keys detected.`);
  if (invalidEEUrlCount) hardFailures.push(`${invalidEEUrlCount} product URLs are not from EE.`);
  if (invalidStoreCount) hardFailures.push(`${invalidStoreCount} products have an invalid store.`);
  if (invalidSourceCount) hardFailures.push(`${invalidSourceCount} products have an invalid source.`);
  if (invalidCategoryCount) hardFailures.push(`${invalidCategoryCount} products have an invalid category.`);
  if (snapshot.listing.totalPagesExpected > 1 && snapshot.listing.totalBatchesLoaded <= 1) hardFailures.push("Scraper only captured the first page.");
  if (!snapshot.listing.seeMoreExhausted) hardFailures.push("EE console listing pages were not fully exhausted.");
  if (oldActiveEeConsoleCount > 0 && productCount < Math.floor(oldActiveEeConsoleCount * LOW_COUNT_RATIO)) {
    hardFailures.push(`New scraped count ${productCount} is suspiciously lower than old active count ${oldActiveEeConsoleCount}.`);
  }
  if (missingPriceCount > Math.max(5, Math.ceil(productCount * MAX_MISSING_PRICE_RATIO))) {
    hardFailures.push(`${missingPriceCount} products are missing prices.`);
  }

  if (missingImageCount) warnings.push(`${missingImageCount} products are missing images.`);
  if (snapshot.failedDetailUrls.length) warnings.push(`${snapshot.failedDetailUrls.length} detail pages failed; listing data is preserved.`);

  return {
    totalListingProductsDiscovered: snapshot.listing.productsCountFromApi,
    totalUniqueProductUrls: productCount,
    totalDetailPagesAttempted: snapshot.products.filter((item) => item.detailAttempted).length,
    totalDetailPagesSucceeded: snapshot.products.filter((item) => item.detailSucceeded).length,
    totalDetailPagesFailed: snapshot.failedDetailUrls.length,
    duplicateUrlCount: snapshot.listing.duplicateUrlCount,
    missingTitleCount,
    missingPriceCount,
    missingImageCount,
    nonConsoleProductCount,
    invalidStoreCount,
    invalidSourceCount,
    invalidCategoryCount,
    invalidEEUrlCount,
    duplicateUniqueKeyCount,
    oldActiveEeConsoleCount,
    newScrapedEeConsoleCount: productCount,
    promotionStatus: "not_requested",
    hardFailures,
    warnings,
  };
}

async function promoteSnapshot(snapshot: EeConsolesSnapshot): Promise<PromotionReport> {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  await assertSyncSchemaReady();
  const shop = await db.shop.upsert({
    where: { slug: STORE },
    update: { name: "Elite Electronics", baseUrl: "https://ee.ge", enabled: true, needsConfiguration: false },
    create: { slug: STORE, name: "Elite Electronics", baseUrl: "https://ee.ge", enabled: true, needsConfiguration: false },
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
        `[ee-consoles] Price anomaly: "${item.originalTitle}" ${existingPrice} -> ${currentPriceGel} GEL, keeping old price (${item.productUrl})`,
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

    const rawOffer = await upsertRawOffer(shop.id, item, undefined);
    let offerExternalId: string | null = item.eeProductId ?? null;
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
            availability: item.availability,
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
              availability: item.availability,
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

async function upsertStandaloneProduct(tx: Prisma.TransactionClient, categoryId: string, item: StagedEeConsole, existingOfferId?: string) {
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

function productData(categoryId: string, item: StagedEeConsole) {
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
    categoryReason: "EE PlayStation-5-category sync validated this source URL.",
    categoryMatchedRules: jsonValue(["ee-playstation-5-category-173"]),
    categorySourceSignals: jsonValue({
      store: STORE,
      sourceCategory: SOURCE_CATEGORY,
      sourceUrl: CATEGORY_URL,
      productUrl: item.productUrl,
    }),
    isPublic: true,
    needsReview: false,
    archivedAt: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;
}

async function upsertRawOffer(shopId: string, item: StagedEeConsole, tx?: Prisma.TransactionClient) {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  const client = tx ?? db;
  let externalId: string | null = item.eeProductId ?? null;
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
    description: stringValue(item.rawListingData.description),
    imageAlt: stringValue(item.rawListingData.imageAlt),
    rawSpecsJson: jsonValue(rawSpecsPayload(item)),
    importBatchId: `ee-consoles:${item.scrapedAt.slice(0, 10)}`,
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
    errorMessage: item.detailError ?? null,
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
            ? `Not present in ${INACTIVE_MISS_THRESHOLD} consecutive EE PlayStation syncs.`
            : "Possibly removed: not present in latest EE PlayStation listing.",
          processedAt: now,
        },
      });
    }
    if (inactive) markedInactive += 1;
  }

  return { possiblyRemoved, markedInactive };
}

async function activeEeConsoleCount() {
  if (!db) return 0;
  const where = {
    shop: { slug: STORE },
    product: {
      categoryNeedsReview: false,
      OR: [{ categorySuggestedSlug: FASMETRI_CATEGORY }, { category: { slug: FASMETRI_CATEGORY } }],
    },
    canonicalKey: { contains: `:${SOURCE_CATEGORY}:` },
    url: { contains: "ee.ge" },
  } satisfies Prisma.ProductOfferWhereInput;
  try {
    return await db.productOffer.count({ where: { ...where, isActive: true } });
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    return db.productOffer.count({ where });
  }
}

async function existingRawStateByUrl(urls: string[]) {
  if (!db || urls.length === 0) return new Map<string, ExistingRawState>();
  const raws = await db.rawOffer.findMany({
    where: { shop: { slug: STORE }, originalUrl: { in: urls } },
    select: { originalUrl: true, originalTitle: true, rawSpecsJson: true },
  });
  return new Map(raws.map((raw) => [raw.originalUrl, { originalTitle: raw.originalTitle, rawSpecsJson: raw.rawSpecsJson }]));
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
      canonicalKey: { contains: `:${SOURCE_CATEGORY}:` },
      url: { contains: "ee.ge" },
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

async function assertSyncSchemaReady() {
  if (!db) return;
  try {
    await db.productOffer.findFirst({ select: { id: true, isActive: true, missedSyncCount: true }, take: 1 });
  } catch (error) {
    if (isMissingColumnError(error)) {
      throw new Error("EE console sync schema is not deployed. Run npm run db:deploy before promotion.");
    }
    throw error;
  }
}

async function fetchCategoryPage(page: number): Promise<EECategoryPage> {
  const response = await fetchWithRetry(categoryPageUrl(page), {
    headers: {
      "user-agent": userAgent(),
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en,ka;q=0.8",
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  const html = await response.text();
  const rawNextData = extractNextData(html);
  const listing = readPath<JsonRecord>(rawNextData, ["props", "pageProps", "initialListingData"]) ?? {};
  return {
    productsCount: integerValue(listing.productsCount),
    products: Array.isArray(listing.products) ? (listing.products as EEListingProduct[]) : [],
    success: Boolean(listing.success),
  };
}

function categoryPageUrl(page: number) {
  if (page <= 1) return CATEGORY_URL;
  const url = new URL(CATEGORY_URL);
  url.searchParams.set("page", String(page));
  return url.toString();
}

async function fetchText(url: string, timeoutMs: number) {
  const response = await fetchWithRetry(url, {
    headers: { "user-agent": userAgent(), "accept-language": "en,ka;q=0.8" },
    timeoutMs,
  });
  return response.text();
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

function normalizeConsoleSpecs(input: {
  title: string;
  listing?: JsonRecord | EEListingProduct;
  detailProduct?: JsonRecord;
  share?: JsonRecord;
  rawSpecValues: EESpecValue[];
}): NormalizedConsoleSpecs {
  const spec = (names: string[]) => specValue(input.rawSpecValues, names);
  const title = input.title;
  const lower = title.toLowerCase();

  // Brand detection
  let brand: string | undefined;
  if (/playstation|ps5|ps4|dualsense|dualshock/i.test(lower)) brand = "Sony";
  else if (/xbox|series x|series s/i.test(lower)) brand = "Microsoft";
  else if (/nintendo|switch/i.test(lower)) brand = "Nintendo";
  brand = brand ?? stringValue(spec(["Brand"])) ?? stringValue((input.listing as EEListingProduct)?.brandName);

  // Storage
  const storageGb = normalizeStorageGb(spec(["Memory", "Internal memory", "Storage"])) ?? normalizeStorageGb(title);

  // Edition/version
  const combinedText = `${title} ${stringValue((input.detailProduct as JsonRecord | undefined)?.description) ?? ""}`;
  let version: NormalizedConsoleSpecs["version"];
  if (/digital\s+edition/i.test(combinedText)) {
    version = "Digital";
  } else if (/\bcd\b|disc\s+edition|blu.?ray/i.test(combinedText)) {
    version = "CD";
  } else if (/bundle/i.test(combinedText)) {
    version = "Bundle";
  } else if (/standard\s+edition/i.test(combinedText)) {
    version = "Standard";
  }

  // Model extraction
  let model: string | undefined;
  if (/ps5\s+slim/i.test(lower) || /playstation\s+5\s+slim/i.test(lower)) model = "PlayStation 5 Slim";
  else if (/ps5|playstation\s+5/i.test(lower)) model = "PlayStation 5";
  else if (/ps4\s+pro/i.test(lower) || /playstation\s+4\s+pro/i.test(lower)) model = "PlayStation 4 Pro";
  else if (/ps4|playstation\s+4/i.test(lower)) model = "PlayStation 4";
  else if (/dualsense\s+edge/i.test(lower)) model = "DualSense Edge";
  else if (/dualsense/i.test(lower)) model = "DualSense";
  else if (/dualshock/i.test(lower)) model = "DualShock 4";

  // Color
  const color = spec(["Color"]) ?? extractColorFromTitle(title);

  return { brand, model, version, storageGb, color };
}

function flattenSpecValues(product: JsonRecord): EESpecValue[] {
  const result: EESpecValue[] = [];
  const groups = Array.isArray(product.specificationGroup) ? product.specificationGroup : [];
  for (const rawGroup of groups) {
    const group = asRecord(rawGroup);
    const groupName = stringValue(group.groupName) ?? "";
    const specs = Array.isArray(group.specifications) ? group.specifications : [];
    for (const rawSpec of specs) {
      const spec = asRecord(rawSpec);
      const name = stringValue(spec.specificationName);
      const meaning = stringValue(spec.specificationMeaning);
      if (!name || !meaning || meaning === "-") continue;
      result.push({
        groupName,
        specificationName: name.trim(),
        specificationMeaning: meaning.trim(),
        isColor: Boolean(spec.isColor),
        colorValue: stringValue(spec.colorValue),
      });
    }
  }
  const keySpecs = Array.isArray(product.keySpecification) ? product.keySpecification : [];
  for (const rawSpec of keySpecs) {
    const spec = asRecord(rawSpec);
    const name = stringValue(spec.specificationName);
    const meaning = stringValue(spec.specificationMeaning);
    if (!name || !meaning || meaning === "-") continue;
    result.push({
      groupName: "Key specification",
      specificationName: name.trim(),
      specificationMeaning: meaning.trim(),
      isColor: Boolean(spec.isColor),
      colorValue: stringValue(spec.colorValue),
    });
  }
  return result;
}

function specValue(values: EESpecValue[], names: string[]) {
  const normalized = new Set(names.map((name) => normalizeSpecKey(name)));
  return values.find((value) => normalized.has(normalizeSpecKey(value.specificationName)))?.specificationMeaning;
}

function normalizeSpecKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function allImageUrls(product: JsonRecord, share: JsonRecord, fallback?: string) {
  const values = [
    ...(Array.isArray(product.images) ? product.images : []),
    stringValue(product.imageUrl),
    stringValue(share.imageUrl),
    fallback,
  ].filter((value): value is string => Boolean(value && /^https?:\/\//i.test(value)));
  return [...new Set(values)];
}

function rawSpecsPayload(item: StagedEeConsole) {
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
      error: item.detailError,
    },
  };
}

function productIdentityFor(item: StagedEeConsole) {
  return {
    productType: "gaming_console",
    categorySlug: FASMETRI_CATEGORY,
    sourceCategory: SOURCE_CATEGORY,
    source: SOURCE,
    store: STORE,
    uniqueKey: item.uniqueKey,
    eeProductId: item.eeProductId,
    productCode: item.productCode,
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    version: item.normalizedSpecs.version,
    storageGb: item.normalizedSpecs.storageGb,
    color: item.normalizedSpecs.color,
    canonicalKey: item.uniqueKey,
    normalizedTitle: normalizeProductTitle(item.originalTitle),
    cleanTitle: removeNoiseWords(item.originalTitle),
    specs: item.normalizedSpecs,
  };
}

function readRawSpecs(value: unknown) {
  const record = asRecord(value);
  if (!record || Object.keys(record).length === 0) return null;
  return {
    allImages: Array.isArray(record.allImages) ? record.allImages.filter((item): item is string => typeof item === "string") : undefined,
    rawSpecs: asRecord(record.rawSpecs),
    normalizedSpecs: asRecord(record.normalizedSpecs) as NormalizedConsoleSpecs | undefined,
  };
}

function isPlayStationListing(product: StagedEeConsole) {
  return PS5_FILTER.test(product.originalTitle);
}

function isEEUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname === "ee.ge";
  } catch {
    return false;
  }
}

function routeForProduct(product: EEListingProduct) {
  return stringValue(product.routeEn) ?? stringValue(product.route) ?? stringValue(product.routeGe) ?? stringValue(product.routeRu);
}

function productIdFromUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).pathname.match(/-p(\d+)\/?$/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeStorageGb(value?: string) {
  if (!value) return undefined;
  const combined = value.match(/\b\d{1,2}\s*\/\s*(\d{2,4})\s*gb\b/i);
  if (combined) return Number(combined[1]);
  const tb = value.match(/\b(\d+(?:\.\d+)?)\s*tb\b/i);
  if (tb) return Math.round(Number(tb[1]) * 1024);
  const gb = [...value.matchAll(/\b(\d{2,4})\s*gb\b/gi)].map((match) => Number(match[1])).filter((amount) => amount >= 8);
  if (gb.length) return Math.max(...gb);
  return undefined;
}

function extractColorFromTitle(title: string) {
  const afterPipe = title.split("|")[1]?.trim();
  if (afterPipe) return afterPipe.replace(/\b\d{2,4}\s*gb\b/gi, "").trim() || undefined;
  const match = title.match(/\b(white|black|silver|red|blue|purple|grey|gray|gold|green|pink|yellow|cobalt|pearl|midnight|starlight|cosmic)\b/i);
  return match?.[1];
}

function normalizeGelPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function discountAmount(price: number | null, oldPrice: number | null) {
  if (price == null || oldPrice == null || oldPrice <= price) return null;
  return Number((oldPrice - price).toFixed(2));
}

function discountPercent(price: number | null, oldPrice: number | null) {
  if (price == null || oldPrice == null || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function integerValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function extractNextData(html: string) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match?.[1]) throw new Error("__NEXT_DATA__ was not found.");
  return JSON.parse(match[1]) as JsonRecord;
}

function readPath<T>(value: unknown, path: string[]): T | undefined {
  let current = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) return undefined;
    current = record[key];
  }
  return current as T;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function jsonRecord(value: unknown): JsonRecord {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonRecord;
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function stableProductSlug(item: StagedEeConsole) {
  const base = slugifyProduct(item.originalTitle);
  const id = item.eeProductId ?? stableHash(item.productUrl).slice(0, 8);
  return `${base}-ee-${id}`;
}

function stableHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function userAgent() {
  return process.env.SCRAPER_USER_AGENT ?? USER_AGENT;
}

async function asyncPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(Math.max(concurrency, 1), Math.max(queue.length, 1)) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  });
  await Promise.all(workers);
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function readSnapshot(rawFile?: string): EeConsolesSnapshot {
  const file = rawFile ? resolve(rawFile) : resolve(defaultRawDir(), "ee-consoles-sync-latest.json");
  if (!existsSync(file)) throw new Error(`Raw snapshot does not exist: ${file}`);
  return JSON.parse(readFileSync(file, "utf8")) as EeConsolesSnapshot;
}

function writeSnapshot(snapshot: EeConsolesSnapshot, rawDir?: string) {
  const dir = writableDir(rawDir ?? defaultRawDir());
  const timestamp = timestampForFile(new Date());
  const file = join(dir, `ee-consoles-sync-${timestamp}.json`);
  const latest = join(dir, "ee-consoles-sync-latest.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2));
  writeFileSync(latest, JSON.stringify({ ...snapshot, rawFile: file }, null, 2));
  return file;
}

function writeReport(report: EeConsoleSyncReport, reportDir?: string) {
  const dir = writableDir(reportDir ?? defaultReportDir());
  const timestamp = timestampForFile(new Date(report.finishedAt));
  const reportFile = join(dir, `ee-consoles-sync-${timestamp}.json`);
  const latestReportFile = join(dir, "ee-consoles-sync-latest.json");
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  writeFileSync(latestReportFile, JSON.stringify({ ...report, reportFile, latestReportFile }, null, 2));
  return { reportFile, latestReportFile };
}

function defaultRawDir() {
  return join(".codex-logs", "ee-consoles", "raw");
}

function defaultReportDir() {
  return "reports";
}

function writableDir(preferred: string) {
  try {
    mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const fallback = join(tmpdir(), "fasmetri-ee-console-sync", preferred.replace(/[:\\/]+/g, "-"));
    mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function timestampForFile(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function withSyncLock<T>(callback: () => Promise<T>) {
  const lockPath = join(".codex-logs", "ee-consoles-sync.lock");
  acquireFileLock(lockPath);
  let dbLocked = false;
  try {
    if (db) {
      const rows = await db.$queryRawUnsafe<Array<{ locked: boolean }>>(`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS locked`);
      dbLocked = Boolean(rows[0]?.locked);
      if (!dbLocked) throw new Error("Another EE console sync is already running.");
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
      throw new Error("Another EE console sync lock is active.");
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
