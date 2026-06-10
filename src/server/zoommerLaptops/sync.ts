import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { OfferAvailability, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeProductName, slugifyProduct } from "@/lib/matching";
import { normalizeProductTitle, removeNoiseWords } from "@/lib/productNormalization";

const STORE = "zoommer";
const SOURCE = "zoommer";
const SOURCE_CATEGORY = "laptops";
const FASMETRI_CATEGORY = "laptops";
const CATEGORY_ID = 531;
const CATEGORY_URL = "https://zoommer.ge/en/laptops-c531";
const CATEGORY_API_URL = "https://zoommer.ge/api/proxy/v1/Products/v3";
const USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";
const PAGE_LIMIT = 28;
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
const ADVISORY_LOCK_ID = 53120260605;

type JsonRecord = Record<string, unknown>;

export type ZoommerLaptopSyncMode = "discover" | "full" | "prices" | "validate" | "promote";

export type ZoommerLaptopSyncOptions = {
  mode: ZoommerLaptopSyncMode;
  promote?: boolean;
  rawFile?: string;
  reportDir?: string;
  rawDir?: string;
  detailLimit?: number;
  dryRun?: boolean;
};

type ZoommerListingProduct = {
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

type ZoommerCategoryPage = {
  productsCount?: number;
  products?: ZoommerListingProduct[];
};

type ZoommerSpecValue = {
  groupName: string;
  specificationName: string;
  specificationMeaning: string;
  isColor?: boolean;
  colorValue?: string | null;
};

type NormalizedLaptopSpecs = {
  brand?: string;
  model?: string;
  normalizedModelName?: string;
  modelCode?: string;
  laptopType?: string;
  series?: string;
  storageGb?: number;
  storageType?: string;
  ramGb?: number;
  ramType?: string;
  color?: string;
  cpu?: string;
  gpu?: string;
  screenSize?: string;
  screenResolution?: string;
  screenType?: string;
  refreshRateHz?: number;
  touchscreen?: boolean;
  operatingSystem?: string;
  battery?: string;
  weightKg?: number;
  keyboardBacklight?: boolean;
  ports?: Record<string, string | boolean>;
  wifiBluetooth?: string;
  webcam?: boolean;
  warranty?: string;
};

export type StagedZoommerLaptop = {
  store: typeof STORE;
  source: typeof SOURCE;
  sourceCategory: typeof SOURCE_CATEGORY;
  category: typeof SOURCE_CATEGORY;
  fasmetriCategorySlug: typeof FASMETRI_CATEGORY;
  uniqueKey: string;
  zoommerProductId?: string;
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
  normalizedSpecs: NormalizedLaptopSpecs;
};

export type ZoommerLaptopsSnapshot = {
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
    totalUniqueLaptopUrls: number;
    duplicateUrlCount: number;
    failedListingUrls: string[];
    seeMoreExhausted: boolean;
  };
  products: StagedZoommerLaptop[];
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
  missingBrandCount: number;
  missingCpuCount: number;
  missingRamCount: number;
  missingStorageCount: number;
  missingScreenCount: number;
  nonLaptopProductCount: number;
  invalidStoreCount: number;
  invalidSourceCount: number;
  invalidCategoryCount: number;
  invalidZoommerUrlCount: number;
  duplicateUniqueKeyCount: number;
  oldActiveZoommerLaptopCount: number;
  newScrapedZoommerLaptopCount: number;
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
};

export type ZoommerLaptopSyncReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  mode: ZoommerLaptopSyncMode;
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

export async function runZoommerLaptopSync(options: ZoommerLaptopSyncOptions): Promise<ZoommerLaptopSyncReport> {
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
    const report: ZoommerLaptopSyncReport = {
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
      throw new Error(`Zoommer laptop sync validation failed: ${validation.hardFailures.join("; ")}`);
    }
    return report;
  });
}

async function scrapeSnapshot(options: ZoommerLaptopSyncOptions): Promise<ZoommerLaptopsSnapshot> {
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
  const failedDetailUrls: ZoommerLaptopsSnapshot["failedDetailUrls"] = [];

  await asyncPool(limitedTargets, mode === "full" ? FULL_DETAIL_CONCURRENCY : PRICE_SYNC_DETAIL_CONCURRENCY, async (item) => {
    await sleep(MIN_DETAIL_DELAY_MS);
    const result = await scrapeDetail(item);
    details.set(item.productUrl, result);
    if (!result.detailSucceeded && result.detailError) failedDetailUrls.push({ url: item.productUrl, reason: result.detailError });
  });

  const products = listing.products.map((item) => mergeDetail(item, details.get(item.productUrl), existing.get(item.productUrl)));
  const snapshot: ZoommerLaptopsSnapshot = {
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
      totalUniqueLaptopUrls: listing.products.length,
      duplicateUrlCount: listing.duplicateUrlCount,
      failedListingUrls: listing.failedListingUrls,
      seeMoreExhausted: listing.totalBatchesLoaded >= listing.totalPagesExpected && listing.failedListingUrls.length === 0,
    },
    products,
    failedDetailUrls,
  };
  return snapshot;
}

async function discoverListing() {
  const cookie = await fetchAccessCookie();
  const firstPage = await fetchCategoryPage(1, cookie);
  const productsCountFromApi = firstPage.productsCount ?? firstPage.products?.length ?? 0;
  const totalPagesExpected = Math.max(1, Math.ceil(productsCountFromApi / PAGE_LIMIT));
  const allProducts: Array<{ product: ZoommerListingProduct; page: number }> = (firstPage.products ?? []).map((product) => ({ product, page: 1 }));
  const failedListingUrls: string[] = [];

  for (let page = 2; page <= totalPagesExpected; page += 1) {
    await sleep(MIN_REQUEST_DELAY_MS);
    try {
      const result = await fetchCategoryPage(page, cookie);
      allProducts.push(...(result.products ?? []).map((product) => ({ product, page })));
    } catch (error) {
      failedListingUrls.push(`${CATEGORY_API_URL}?CategoryId=${CATEGORY_ID}&Page=${page}&Limit=${PAGE_LIMIT}: ${errorMessage(error)}`);
    }
  }

  const unique = new Map<string, StagedZoommerLaptop>();
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
    firstBatchCount: firstPage.products?.length ?? 0,
    totalBatchesLoaded: 1 + (totalPagesExpected - 1 - failedListingUrls.length),
    totalPagesExpected,
    productsCountFromApi,
    products: [...unique.values()],
    duplicateUrlCount,
    failedListingUrls,
  };
}

function stagedFromListing(product: ZoommerListingProduct, listingPage: number): StagedZoommerLaptop {
  const route = routeForProduct(product);
  const productUrl = route ? new URL(route.replace(/^\//, ""), "https://zoommer.ge/").toString() : "";
  const title = String(product.name ?? "").trim();
  const currentPriceGel = normalizeGelPrice(product.price);
  const oldPriceGel = normalizeGelPrice(product.previousPrice);
  const discountAmountGel = normalizeGelPrice(product.discountAmount) ?? discountAmount(currentPriceGel, oldPriceGel);
  const normalizedSpecs = normalizeLaptopSpecs({
    title,
    listing: product,
    rawSpecValues: [],
  });
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
    zoommerProductId: id ?? undefined,
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
    availability: product.isInStock === true ? OfferAvailability.IN_STOCK : product.isInStock === false ? OfferAvailability.OUT_OF_STOCK : OfferAvailability.UNKNOWN,
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

async function scrapeDetail(item: StagedZoommerLaptop) {
  try {
    const html = await fetchText(detailFetchUrl(item.productUrl), DETAIL_TIMEOUT_MS);
    const rawNextData = extractNextData(html);
    const product = readPath<JsonRecord>(rawNextData, ["props", "pageProps", "initialProductData", "product"]) ?? {};
    const share = readPath<JsonRecord>(rawNextData, ["props", "pageProps", "sharePageData"]) ?? {};
    const rawSpecValues = flattenSpecValues(product);
    const normalizedSpecs = normalizeLaptopSpecs({
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

function detailFetchUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!url.pathname.startsWith("/en/")) {
    url.pathname = `/en${url.pathname}`;
  }
  return url.toString();
}

function mergeDetail(item: StagedZoommerLaptop, detail?: Awaited<ReturnType<typeof scrapeDetail>>, existing?: ExistingRawState): StagedZoommerLaptop {
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

async function validateSnapshot(snapshot: ZoommerLaptopsSnapshot): Promise<ValidationReport> {
  const urls = new Set<string>();
  const keys = new Set<string>();
  let duplicateUniqueKeyCount = 0;
  let missingTitleCount = 0;
  let missingPriceCount = 0;
  let missingImageCount = 0;
  let missingBrandCount = 0;
  let missingCpuCount = 0;
  let missingRamCount = 0;
  let missingStorageCount = 0;
  let missingScreenCount = 0;
  let nonLaptopProductCount = 0;
  let invalidStoreCount = 0;
  let invalidSourceCount = 0;
  let invalidCategoryCount = 0;
  let invalidZoommerUrlCount = 0;

  for (const product of snapshot.products) {
    if (urls.has(product.productUrl)) continue;
    urls.add(product.productUrl);
    if (keys.has(product.uniqueKey)) duplicateUniqueKeyCount += 1;
    keys.add(product.uniqueKey);
    if (!product.originalTitle) missingTitleCount += 1;
    if (product.currentPriceGel == null) missingPriceCount += 1;
    if (!product.imageUrl) missingImageCount += 1;
    if (!product.brand && !product.normalizedSpecs.brand) missingBrandCount += 1;
    if (!product.normalizedSpecs.cpu) missingCpuCount += 1;
    if (!product.normalizedSpecs.ramGb) missingRamCount += 1;
    if (!product.normalizedSpecs.storageGb) missingStorageCount += 1;
    if (!product.normalizedSpecs.screenSize && !product.normalizedSpecs.screenResolution) missingScreenCount += 1;
    if (!isLaptopListing(product)) nonLaptopProductCount += 1;
    if (product.store !== STORE) invalidStoreCount += 1;
    if (product.source !== SOURCE) invalidSourceCount += 1;
    if (product.category !== SOURCE_CATEGORY || product.fasmetriCategorySlug !== FASMETRI_CATEGORY) invalidCategoryCount += 1;
    if (!isZoommerUrl(product.productUrl)) invalidZoommerUrlCount += 1;
  }

  const oldActiveZoommerLaptopCount = await activeZoommerLaptopCount();
  const hardFailures: string[] = [];
  const warnings: string[] = [];
  const productCount = snapshot.products.length;

  if (nonLaptopProductCount) hardFailures.push(`${nonLaptopProductCount} non-laptop products detected.`);
  if (duplicateUniqueKeyCount) hardFailures.push(`${duplicateUniqueKeyCount} duplicate unique keys detected.`);
  if (invalidZoommerUrlCount) hardFailures.push(`${invalidZoommerUrlCount} product URLs are not from Zoommer.`);
  if (invalidStoreCount) hardFailures.push(`${invalidStoreCount} products have an invalid store.`);
  if (invalidSourceCount) hardFailures.push(`${invalidSourceCount} products have an invalid source.`);
  if (invalidCategoryCount) hardFailures.push(`${invalidCategoryCount} products have an invalid category.`);
  if (snapshot.listing.totalPagesExpected > 1 && snapshot.listing.totalBatchesLoaded <= 1) hardFailures.push("Scraper only captured the first page.");
  if (!snapshot.listing.seeMoreExhausted) hardFailures.push("Zoommer listing pages were not fully exhausted.");
  if (oldActiveZoommerLaptopCount > 0 && productCount < Math.floor(oldActiveZoommerLaptopCount * LOW_COUNT_RATIO)) {
    hardFailures.push(`New scraped count ${productCount} is suspiciously lower than old active count ${oldActiveZoommerLaptopCount}.`);
  }
  if (missingPriceCount > Math.max(5, Math.ceil(productCount * MAX_MISSING_PRICE_RATIO))) {
    hardFailures.push(`${missingPriceCount} products are missing prices.`);
  }

  if (missingImageCount) warnings.push(`${missingImageCount} products are missing images.`);
  if (missingBrandCount) warnings.push(`${missingBrandCount} products are missing brands.`);
  if (missingCpuCount) warnings.push(`${missingCpuCount} products are missing CPU.`);
  if (missingRamCount) warnings.push(`${missingRamCount} products are missing RAM.`);
  if (missingStorageCount) warnings.push(`${missingStorageCount} products are missing storage.`);
  if (missingScreenCount) warnings.push(`${missingScreenCount} products are missing screen data.`);
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
    missingBrandCount,
    missingCpuCount,
    missingRamCount,
    missingStorageCount,
    missingScreenCount,
    nonLaptopProductCount,
    invalidStoreCount,
    invalidSourceCount,
    invalidCategoryCount,
    invalidZoommerUrlCount,
    duplicateUniqueKeyCount,
    oldActiveZoommerLaptopCount,
    newScrapedZoommerLaptopCount: productCount,
    promotionStatus: "not_requested",
    hardFailures,
    warnings,
  };
}

async function promoteSnapshot(snapshot: ZoommerLaptopsSnapshot): Promise<PromotionReport> {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  await assertSyncSchemaReady();
  const shop = await db.shop.upsert({
    where: { slug: STORE },
    update: { name: "Zoommer", baseUrl: "https://zoommer.ge", enabled: true, needsConfiguration: false },
    create: { slug: STORE, name: "Zoommer", baseUrl: "https://zoommer.ge", enabled: true, needsConfiguration: false },
  });
  const category = await db.category.upsert({
    where: { slug: FASMETRI_CATEGORY },
    update: {},
    create: { slug: FASMETRI_CATEGORY, nameKa: "Laptops", nameEn: "Laptops" },
  });

  const existingOffers = await existingOfferStateByUrl(shop.id);
  const liveUrls = new Set(snapshot.products.map((item) => item.productUrl));
  let totalImportedOrUpserted = 0;
  let totalUpdatedPrices = 0;
  let totalNewProducts = 0;
  let skippedCount = 0;

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
    const priceChanged = existingPrice !== currentPriceGel || existingOldPrice !== item.oldPriceGel;
    const saleDetectedAt = item.discountPercent > 0 ? existing?.saleDetectedAt ?? new Date() : null;

    const rawOffer = await upsertRawOffer(shop.id, item, undefined);
    let offerExternalId: string | null = item.zoommerProductId ?? null;
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
            currentPrice: currentPriceGel,
            oldPrice: item.oldPriceGel,
            discountAmount: item.discountAmountGel,
            discountPercent: item.discountPercent,
            isOnSale: item.discountPercent > 0,
            saleDetectedAt,
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
  };
}

async function upsertStandaloneProduct(tx: Prisma.TransactionClient, categoryId: string, item: StagedZoommerLaptop, existingOfferId?: string) {
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

function productData(categoryId: string, item: StagedZoommerLaptop) {
  return {
    name: item.originalTitle,
    normalizedName: normalizeProductName(item.originalTitle),
    canonicalKey: item.uniqueKey,
    productIdentity: jsonValue(productIdentityFor(item)),
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.normalizedModelName,
    imageUrl: item.imageUrl,
    categoryId,
    categoryConfidence: 100,
    categoryNeedsReview: false,
    categorySuggestedSlug: FASMETRI_CATEGORY,
    categoryReason: "Zoommer laptop-only sync validated this source URL.",
    categoryMatchedRules: jsonValue(["zoommer-laptops-category-531"]),
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

async function upsertRawOffer(shopId: string, item: StagedZoommerLaptop, tx?: Prisma.TransactionClient) {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  const client = tx ?? db;
  let externalId: string | null = item.zoommerProductId ?? null;
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
    importBatchId: `zoommer-laptops:${item.scrapedAt.slice(0, 10)}`,
    storeKey: STORE,
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.normalizedModelName,
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
            ? `Not present in ${INACTIVE_MISS_THRESHOLD} consecutive Zoommer laptop syncs.`
            : "Possibly removed: not present in latest Zoommer laptop listing.",
          processedAt: now,
        },
      });
    }
    if (inactive) markedInactive += 1;
  }

  return { possiblyRemoved, markedInactive };
}

async function activeZoommerLaptopCount() {
  if (!db) return 0;
  const where = {
    shop: { slug: STORE },
    product: {
      categoryNeedsReview: false,
      OR: [{ categorySuggestedSlug: FASMETRI_CATEGORY }, { category: { slug: FASMETRI_CATEGORY } }],
    },
    url: { contains: "zoommer.ge" },
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
      url: { contains: "zoommer.ge" },
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
      throw new Error("Zoommer laptop sync schema is not deployed. Run npm run db:deploy before promotion.");
    }
    throw error;
  }
}

async function fetchAccessCookie() {
  const response = await fetchWithRetry(CATEGORY_URL, {
    headers: { "user-agent": userAgent(), "accept-language": "en,ka;q=0.8" },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  const token = [...setCookie.matchAll(/zoommer-access_token=([^;]+)/g)].map((match) => match[1]).at(-1);
  if (!token) throw new Error("Zoommer access cookie was not returned.");
  return `zoommer-access_token=${token}`;
}

async function fetchCategoryPage(page: number, cookie: string): Promise<ZoommerCategoryPage> {
  const url = new URL(CATEGORY_API_URL);
  url.searchParams.set("CategoryId", String(CATEGORY_ID));
  url.searchParams.set("Page", String(page));
  url.searchParams.set("Limit", String(PAGE_LIMIT));
  const response = await fetchWithRetry(url.toString(), {
    headers: {
      "user-agent": userAgent(),
      accept: "application/json, text/plain, */*",
      "accept-language": "en,ka;q=0.8",
      os: "web",
      referer: CATEGORY_URL,
      cookie,
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  return (await response.json()) as ZoommerCategoryPage;
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

function normalizeLaptopSpecs(input: {
  title: string;
  listing?: JsonRecord | ZoommerListingProduct;
  detailProduct?: JsonRecord;
  share?: JsonRecord;
  rawSpecValues: ZoommerSpecValue[];
}): NormalizedLaptopSpecs {
  const spec = (names: string[]) => specValue(input.rawSpecValues, names);
  const title = input.title;
  const brand = normalizeBrand(
    spec(["Brand", "ბრენდი"]) ??
      stringValue(input.share?.brandName) ??
      stringValue(input.detailProduct?.brandName) ??
      stringValue(input.listing?.brandName) ??
      stringValue(input.listing?.categoryName) ??
      extractBrand(title),
  );
  const color = spec(["Color", "ფერი"]) ?? extractColorFromTitle(title);
  const model = spec(["Model", "მოდელი"]) ?? extractModelName(title, brand, color);
  const modelCode = extractModelCode(title);
  const cpu = normalizeCpu(spec(["Central processor", "Processor", "Processor Generation", "ცენტრალური პროცესორი", "პროცესორის თაობა"]) ?? title);
  const gpu = normalizeGpu(spec(["Graphics processor", "Graphic Processor", "გრაფიკული პროცესორი"]) ?? title);
  const internalMemory = spec(["Internal memory", "Internal Memory", "შიდა მეხსიერება"]);
  const internalMemoryType = spec(["Internal Memory Type", "Internal Memory interface", "შიდა მეხსიერების ტიპი", "შიდა მეხსიერების ინტერფეისი"]);
  const ram = spec(["RAM", "ოპერატიული მეხსიერება"]);
  const ramType = spec(["Type of RAM", "RAM Memory Type", "ოპერატიული მეხსიერების ტიპი"]);
  const screenSize = spec(["Screen size", "Screen Size", "ეკრანის ზომა"]);
  const screenResolution = spec(["Resolution", "რეზოლუცია"]);
  const refreshRate = spec(["Refresh rate", "Refresh Rate", "განახლების სიხშირე"]);
  const bluetooth = spec(["Bluetooth"]);
  const wifi = spec(["Wi-Fi", "WiFi", "Wireless", "Wireless internet"]);
  const ports = collectPorts(spec);

  return {
    brand,
    model,
    normalizedModelName: normalizeModelName(model ?? title, brand, color),
    modelCode,
    laptopType: spec(["Laptop Type", "ლეპტოპის ტიპი"]),
    series: extractSeries(model ?? title),
    storageGb: normalizeStorageGb(internalMemory) ?? normalizeStorageGb(title),
    storageType: normalizeStorageType(internalMemoryType) ?? normalizeStorageType(title),
    ramGb: normalizeRamGb(ram) ?? normalizeRamGb(title),
    ramType: normalizeRamType(ramType) ?? normalizeRamType(title),
    color,
    cpu,
    gpu,
    screenSize,
    screenResolution,
    screenType: spec(["Screen type", "Screen Type", "ეკრანის ტიპი"]),
    refreshRateHz: parseInteger(refreshRate),
    touchscreen: booleanSpec(spec(["Touch Screen", "Touchscreen", "სენსორული ეკრანი"])),
    operatingSystem: spec(["Operating system", "Operating System", "ოპერაციული სისტემა"]),
    battery: spec(["Battery", "Element type", "ბატარეა"]),
    weightKg: parseWeightKg(spec(["Weight", "წონა"])),
    keyboardBacklight: booleanSpec(spec(["Keyboard lighting", "Keyboard Backlight", "კლავიატურის განათება"])),
    ports,
    wifiBluetooth: [wifi, bluetooth ? `Bluetooth ${bluetooth}` : undefined].filter(Boolean).join("; ") || undefined,
    webcam: booleanSpec(spec(["Web Camera", "Webcam", "ვებ კამერა"])),
    warranty: spec(["Warranty"]),
  };
}

function flattenSpecValues(product: JsonRecord): ZoommerSpecValue[] {
  const result: ZoommerSpecValue[] = [];
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

function specValue(values: ZoommerSpecValue[], names: string[]) {
  const normalized = new Set(names.map((name) => normalizeSpecKey(name)));
  return values.find((value) => normalized.has(normalizeSpecKey(value.specificationName)))?.specificationMeaning;
}

function normalizeSpecKey(value: string) {
  return value.toLowerCase().replace(/[\s_\-:()]+/g, "");
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

function rawSpecsPayload(item: StagedZoommerLaptop) {
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

function productIdentityFor(item: StagedZoommerLaptop) {
  return {
    productType: "laptop",
    categorySlug: FASMETRI_CATEGORY,
    sourceCategory: SOURCE_CATEGORY,
    source: SOURCE,
    store: STORE,
    uniqueKey: item.uniqueKey,
    zoommerProductId: item.zoommerProductId,
    productCode: item.productCode,
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    normalizedModelName: item.normalizedSpecs.normalizedModelName,
    modelCode: item.normalizedSpecs.modelCode,
    laptopType: item.normalizedSpecs.laptopType,
    cpu: item.normalizedSpecs.cpu,
    gpu: item.normalizedSpecs.gpu,
    storageGb: item.normalizedSpecs.storageGb,
    storageType: item.normalizedSpecs.storageType,
    ramGb: item.normalizedSpecs.ramGb,
    ramType: item.normalizedSpecs.ramType,
    color: item.normalizedSpecs.color,
    screenSize: item.normalizedSpecs.screenSize,
    screenResolution: item.normalizedSpecs.screenResolution,
    screenType: item.normalizedSpecs.screenType,
    refreshRateHz: item.normalizedSpecs.refreshRateHz,
    operatingSystem: item.normalizedSpecs.operatingSystem,
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
    normalizedSpecs: asRecord(record.normalizedSpecs) as NormalizedLaptopSpecs | undefined,
  };
}

function isLaptopListing(product: StagedZoommerLaptop) {
  const routeOk = /\/laptops\//i.test(new URL(product.productUrl).pathname);
  const listing = product.rawListingData;
  const categoryId = String(listing.categoryId ?? "");
  const parentCategory = String(listing.parentCategoryName ?? "").toLowerCase();
  return routeOk && (categoryId === String(CATEGORY_ID) || parentCategory.includes("laptop"));
}

function isZoommerUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname === "zoommer.ge";
  } catch {
    return false;
  }
}

function routeForProduct(product: ZoommerListingProduct) {
  return stringValue(product.routeEn) ?? stringValue(product.route) ?? stringValue(product.routeGe) ?? stringValue(product.routeRu);
}

function productIdFromUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).pathname.match(/-p(\d+)\/?$/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeGelPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStorageGb(value?: string) {
  if (!value) return undefined;
  const combined = value.match(/\b\d{1,2}\s*\/\s*(\d{2,4})\s*gb\b/i);
  if (combined) return Number(combined[1]);
  const tb = value.match(/\b(\d+(?:\.\d+)?)\s*tb\b/i);
  if (tb) return Math.round(Number(tb[1]) * 1024);
  const gb = [...value.matchAll(/\b(\d{2,4})\s*gb\b/gi)].map((match) => Number(match[1])).filter((amount) => amount >= 16);
  return gb.length ? Math.max(...gb) : undefined;
}

function normalizeStorageType(value?: string) {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper.includes("NVME")) return "NVMe";
  if (upper.includes("SSD")) return "SSD";
  if (upper.includes("HDD")) return "HDD";
  if (upper.includes("EMMC")) return "eMMC";
  if (upper.includes("UFS")) return "UFS";
  if (upper.includes("M.2")) return "M.2";
  return undefined;
}

function normalizeRamGb(value?: string) {
  if (!value) return undefined;
  const combined = value.match(/\b(\d{1,2})\s*\/\s*\d{2,4}\s*gb\b/i);
  if (combined) return Number(combined[1]);
  const ram = value.match(/\b(\d{1,2})\s*gb\s*ram\b/i) ?? value.match(/\bram\s*(\d{1,2})\s*gb\b/i);
  if (ram) return Number(ram[1]);
  const plain = value.match(/\b(\d{1,2})\s*gb\b/i);
  return plain ? Number(plain[1]) : undefined;
}

function normalizeRamType(value?: string) {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  const match = upper.match(/\b(LPDDR\dX?|DDR\dX?)\b/);
  return match?.[1];
}

function normalizeCpu(value?: string) {
  if (!value) return undefined;
  const clean = cleanSpecText(value);
  if (!clean) return undefined;
  const patterns = [
    /\bIntel\s+Core\s+Ultra\s+[3579]\s+\d{3,4}[A-Z]*\b/i,
    /\bIntel\s+Core\s+i[3579][-\s]?\d{3,5}[A-Z]*\b/i,
    /\bCore\s+Ultra\s+[3579]\s+\d{3,4}[A-Z]*\b/i,
    /\bCore\s+i[3579][-\s]?\d{3,5}[A-Z]*\b/i,
    /\bAMD\s+Ryzen\s+[3579]\s+\d{3,5}[A-Z]*\b/i,
    /\bRyzen\s+[3579]\s+\d{3,5}[A-Z]*\b/i,
    /\bApple\s+M[1-9]\s*(?:Pro|Max|Ultra)?\b/i,
    /\bApple\s+A\d+\s*(?:Pro|Bionic)?\b/i,
    /\bSnapdragon\s+X\s*(?:Elite|Plus)?\b/i,
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return clean === "-" ? undefined : clean;
}

function normalizeGpu(value?: string) {
  if (!value) return undefined;
  const clean = cleanSpecText(value);
  if (!clean) return undefined;
  const patterns = [
    /\bNVIDIA\s+GeForce\s+RTX\s*\d{3,4}\w*\b/i,
    /\bGeForce\s+RTX\s*\d{3,4}\w*\b/i,
    /\bNVIDIA\s+GeForce\s+GTX\s*\d{3,4}\w*\b/i,
    /\bGeForce\s+GTX\s*\d{3,4}\w*\b/i,
    /\bAMD\s+Radeon\s+[A-Z0-9\s-]+\b/i,
    /\bRadeon\s+[A-Z0-9\s-]+\b/i,
    /\bIntel\s+(?:Iris|Arc|UHD)[A-Z0-9\s-]*\b/i,
    /\bApple\s+GPU\b/i,
    /\b\d+\s*Core\s+GPU\b/i,
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return clean === "-" ? undefined : clean;
}

function cleanSpecText(value?: string) {
  const clean = value?.replace(/\s+/g, " ").trim();
  return clean && clean !== "-" ? clean : undefined;
}

function parseWeightKg(value?: string) {
  if (!value) return undefined;
  const kg = value.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (kg) return Number(kg[1].replace(",", "."));
  const grams = value.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  if (grams) return Number(grams[1].replace(",", ".")) / 1000;
  return undefined;
}

function collectPorts(spec: (names: string[]) => string | undefined) {
  const entries: Record<string, string | boolean> = {};
  const names: Array<[string, string[]]> = [
    ["usb", ["USB"]],
    ["typeC", ["Type-C", "USB-C"]],
    ["typeCCharging", ["Type-C Charging", "Type-C პორტით დამუხტვა"]],
    ["hdmi", ["HDMI"]],
    ["lan", ["Lan Port", "LAN", "ლან პორტი"]],
    ["audioJack", ["3.5mm"]],
  ];
  for (const [key, aliases] of names) {
    const value = spec(aliases);
    if (value == null) continue;
    entries[key] = booleanSpec(value) ?? value;
  }
  return Object.keys(entries).length ? entries : undefined;
}

function normalizeBrand(value?: string) {
  const brand = value?.trim();
  if (!brand) return undefined;
  const lower = brand.toLowerCase();
  if (lower === "hewlett packard") return "HP";
  const known = LAPTOP_BRANDS.find((item) => item.toLowerCase() === lower);
  return known ?? brand;
}

const LAPTOP_BRANDS = [
  "Apple",
  "Lenovo",
  "Asus",
  "Acer",
  "HP",
  "Dell",
  "MSI",
  "Gigabyte",
  "Honor",
  "Huawei",
  "Microsoft",
  "Samsung",
  "LG",
  "Xiaomi",
] as const;

function extractBrand(title: string) {
  const lower = title.toLowerCase();
  return LAPTOP_BRANDS.find((brand) => lower.includes(brand.toLowerCase()));
}

function normalizeModelName(title: string, brand?: string, color?: string) {
  return extractModelName(title, brand, color)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractModelName(title: string, brand?: string, color?: string) {
  let value = title.split("|")[0] ?? title;
  value = value
    .replace(/\b\d{1,2}\s*\/\s*\d{2,4}\s*gb\b/gi, " ")
    .replace(/\b\d{2,4}\s*gb\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*tb\b/gi, " ")
    .replace(/\b(?:LP)?DDR\dX?\b/gi, " ")
    .replace(/\b(?:SSD|HDD|NVMe|M\.2|eMMC)\b/gi, " ")
    .replace(/\b(?:Intel\s+)?Core\s+Ultra\s+[3579]\s+\d{3,4}[A-Z]*\b/gi, " ")
    .replace(/\b(?:Intel\s+)?Core\s+i[3579][-\s]?\d{3,5}[A-Z]*\b/gi, " ")
    .replace(/\b(?:AMD\s+)?Ryzen\s+[3579]\s+\d{3,5}[A-Z]*\b/gi, " ")
    .replace(/\bApple\s+[AM]\d+\s*(?:Pro|Max|Ultra|Bionic)?\b/gi, " ")
    .replace(/\bSnapdragon\s+X\s*(?:Elite|Plus)?\b/gi, " ")
    .replace(/\b(?:NVIDIA\s+)?(?:GeForce\s+)?(?:RTX|GTX)\s*\d{3,4}\w*\b/gi, " ")
    .replace(/\b\d+c\s+CPU\b/gi, " ")
    .replace(/\b\d+c\s+GPU\b/gi, " ");
  const modelCode = extractModelCode(title);
  if (modelCode) value = value.replace(new RegExp(escapeRegExp(modelCode), "ig"), " ");
  if (color) value = value.replace(new RegExp(escapeRegExp(color), "ig"), " ");
  if (brand && !new RegExp(`^\\s*${escapeRegExp(brand)}\\b`, "i").test(value)) value = `${brand} ${value}`;
  return value.replace(/\s+/g, " ").trim() || undefined;
}

function extractSeries(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("macbook")) return "MacBook";
  if (normalized.includes("thinkpad")) return "ThinkPad";
  if (normalized.includes("ideapad")) return "IdeaPad";
  if (normalized.includes("vivobook")) return "VivoBook";
  if (normalized.includes("zenbook")) return "Zenbook";
  if (normalized.includes("rog")) return "ROG";
  if (normalized.includes("tuf")) return "TUF";
  if (normalized.includes("victus")) return "Victus";
  if (normalized.includes("omen")) return "Omen";
  if (normalized.includes("inspiron")) return "Inspiron";
  if (normalized.includes("latitude")) return "Latitude";
  if (normalized.includes("xps")) return "XPS";
  return undefined;
}

function extractModelCode(title: string) {
  const candidates = title.match(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9-]{6,}\b/g) ?? [];
  return candidates.find((candidate) => !/^(?:DDR\d|LPDDR|RTX|GTX|CPU|GPU|FHD|UHD|OLED|WUXGA|GB|TB)/i.test(candidate));
}

function extractColorFromTitle(title: string) {
  const afterPipe = title.split("|")[1]?.trim();
  if (afterPipe) {
    const color = afterPipe.replace(/\b\d{2,4}\s*gb\b/gi, "").replace(/\b\d+(?:\.\d+)?\s*tb\b/gi, "").trim();
    if (color) return color;
  }
  const match = title.match(/(?:GB|TB)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})$/);
  return match?.[1]?.trim();
}

function booleanSpec(value?: string) {
  if (!value) return undefined;
  if (/^(yes|true|available|has)$/i.test(value.trim())) return true;
  if (/^(no|false|none|not available)$/i.test(value.trim())) return false;
  return undefined;
}

function discountAmount(price: number | null, oldPrice: number | null) {
  if (price == null || oldPrice == null || oldPrice <= price) return null;
  return Number((oldPrice - price).toFixed(2));
}

function discountPercent(price: number | null, oldPrice: number | null) {
  if (price == null || oldPrice == null || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function parseInteger(value?: string) {
  if (!value) return undefined;
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : undefined;
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

function stableProductSlug(item: StagedZoommerLaptop) {
  const base = slugifyProduct(item.originalTitle);
  const id = item.zoommerProductId ?? stableHash(item.productUrl).slice(0, 8);
  return `${base}-zoommer-${id}`;
}

function stableHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function readSnapshot(rawFile?: string): ZoommerLaptopsSnapshot {
  const file = rawFile ? resolve(rawFile) : resolve(defaultRawDir(), "zoommer-laptops-sync-latest.json");
  if (!existsSync(file)) throw new Error(`Raw snapshot does not exist: ${file}`);
  return JSON.parse(readFileSync(file, "utf8")) as ZoommerLaptopsSnapshot;
}

function writeSnapshot(snapshot: ZoommerLaptopsSnapshot, rawDir?: string) {
  const dir = writableDir(rawDir ?? defaultRawDir());
  const timestamp = timestampForFile(new Date());
  const file = join(dir, `zoommer-laptops-sync-${timestamp}.json`);
  const latest = join(dir, "zoommer-laptops-sync-latest.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2));
  writeFileSync(latest, JSON.stringify({ ...snapshot, rawFile: file }, null, 2));
  return file;
}

function writeReport(report: ZoommerLaptopSyncReport, reportDir?: string) {
  const dir = writableDir(reportDir ?? defaultReportDir());
  const timestamp = timestampForFile(new Date(report.finishedAt));
  const reportFile = join(dir, `zoommer-laptops-sync-${timestamp}.json`);
  const latestReportFile = join(dir, "zoommer-laptops-sync-latest.json");
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  writeFileSync(latestReportFile, JSON.stringify({ ...report, reportFile, latestReportFile }, null, 2));
  return { reportFile, latestReportFile };
}

function defaultRawDir() {
  return join(".codex-logs", "zoommer-laptops", "raw");
}

function defaultReportDir() {
  return "reports";
}

function writableDir(preferred: string) {
  try {
    mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const fallback = join(tmpdir(), "fasmetri-zoommer-laptop-sync", preferred.replace(/[:\\/]+/g, "-"));
    mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function timestampForFile(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function withSyncLock<T>(callback: () => Promise<T>) {
  const lockPath = join(".codex-logs", "zoommer-laptops-sync.lock");
  acquireFileLock(lockPath);
  let dbLocked = false;
  try {
    if (db) {
      const rows = await db.$queryRawUnsafe<Array<{ locked: boolean }>>(`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS locked`);
      dbLocked = Boolean(rows[0]?.locked);
      if (!dbLocked) throw new Error("Another Zoommer laptop sync is already running.");
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
      throw new Error("Another Zoommer laptop sync lock is active.");
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
    // Prisma 7 + @prisma/adapter-pg puts constraint info in meta.driverAdapterError, not meta.target.
    // Serialize the whole meta to catch either format.
    return JSON.stringify(error.meta ?? "").includes("externalId");
  }
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("externalId");
}

function isMissingColumnError(error: unknown) {
  const text = errorMessage(error).toLowerCase();
  return text.includes("column") && (text.includes("does not exist") || text.includes("not available"));
}
