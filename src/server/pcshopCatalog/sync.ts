import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { OfferAvailability, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAnomalousPriceChange, recordPriceAnomaly } from "@/server/sync/priceAnomalyGuard";
import { normalizeProductName, slugifyProduct } from "@/lib/matching";
import { normalizeProductTitle, removeNoiseWords } from "@/lib/productNormalization";

// PCShop phones + laptops sync over the WooCommerce Store API. Discovery is
// authoritative: the Store API `category=<term id>` filter returns exactly the
// products PCShop lists in that category (the flat product sitemap has no
// category data and slug-keyword filtering proved unreliable). Listing pages
// already carry full attribute data, so no detail fetches are needed.
//
// This module is the category-parameterized sibling of
// src/server/pcshopConsoles/sync.ts (which stays search-based because consoles
// span several PCShop categories).

const STORE = "pcshop";
const SOURCE = "pcshop";
const STORE_BASE_URL = "https://pcshop.ge";
const LISTING_API_URL = "https://pcshop.ge/wp-json/wc/store/v1/products";
const PAGE_LIMIT = 100;
const USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 2;
const MIN_REQUEST_DELAY_MS = 450;
const LOW_COUNT_RATIO = 0.7;
const MAX_MISSING_PRICE_RATIO = 0.1;
const INACTIVE_MISS_THRESHOLD = 3;

export type PcshopCatalogCategory = "phones" | "laptops";

type CategoryConfig = {
  // WooCommerce product_cat term id (from /wp-json/wc/store/v1/products/categories)
  wooCategoryId: number;
  sourceCategory: string;
  fasmetriCategory: string;
  productType: string;
  // Lock IDs in use: 85520260605 (zoommer-phones), 53120260605 (zoommer-laptops),
  //                  37720260605 (ee-phones), 5820260605 (ee-laptops),
  //                  90000000001 (pcshop-consoles)
  advisoryLockId: number;
  slugPrefix: string;
};

const CATEGORY_CONFIGS: Record<PcshopCatalogCategory, CategoryConfig> = {
  phones: {
    wooCategoryId: 21874,
    sourceCategory: "smartphones",
    fasmetriCategory: "mobiles",
    productType: "mobile_phone",
    advisoryLockId: 90000000002,
    slugPrefix: "pcshop-phones",
  },
  laptops: {
    wooCategoryId: 10942,
    sourceCategory: "notebooks",
    fasmetriCategory: "laptops",
    productType: "laptop",
    advisoryLockId: 90000000003,
    slugPrefix: "pcshop-laptops",
  },
};

type JsonRecord = Record<string, unknown>;

export type PcshopCatalogSyncMode = "discover" | "full" | "prices" | "validate" | "promote";

export type PcshopCatalogSyncOptions = {
  category: PcshopCatalogCategory;
  mode: PcshopCatalogSyncMode;
  promote?: boolean;
  rawFile?: string;
  reportDir?: string;
  rawDir?: string;
  dryRun?: boolean;
};

// WooCommerce Store API product shape (subset we use). Attribute values come
// as taxonomy terms, not flat strings.
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
  attributes?: Array<{
    name: string;
    taxonomy?: string | null;
    terms?: Array<{ name: string }> | null;
    value?: string;
  }> | null;
};

type NormalizedCatalogSpecs = {
  brand?: string;
  model?: string;
  partNumber?: string;
  storageGb?: number;
  storageType?: string;
  ramGb?: number;
  screenSize?: string;
  cpu?: string;
  gpu?: string;
  color?: string;
  operatingSystem?: string;
  releaseYear?: number;
};

export type StagedPcshopCatalogItem = {
  store: typeof STORE;
  source: typeof SOURCE;
  sourceCategory: string;
  category: string;
  fasmetriCategorySlug: string;
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
  specDescription?: string;
  allImages: string[];
  rawSpecs: JsonRecord;
  normalizedSpecs: NormalizedCatalogSpecs;
};

export type PcshopCatalogSnapshot = {
  version: 1;
  category: PcshopCatalogCategory;
  mode: "discover" | "full" | "prices";
  sourceUrl: typeof LISTING_API_URL;
  startedAt: string;
  finishedAt?: string;
  listing: {
    firstBatchCount: number;
    totalBatchesLoaded: number;
    totalPagesExpected: number;
    productsCountFromApi: number;
    totalUniqueProductUrls: number;
    duplicateUrlCount: number;
    failedListingUrls: string[];
    listingExhausted: boolean;
  };
  products: StagedPcshopCatalogItem[];
  rawFile?: string;
};

type ValidationReport = {
  totalListingProductsDiscovered: number;
  totalUniqueProductUrls: number;
  duplicateUrlCount: number;
  missingTitleCount: number;
  missingPriceCount: number;
  missingImageCount: number;
  missingBrandCount: number;
  invalidStoreCount: number;
  invalidSourceCount: number;
  invalidCategoryCount: number;
  invalidPcshopUrlCount: number;
  duplicateUniqueKeyCount: number;
  oldActiveOfferCount: number;
  newScrapedCount: number;
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

export type PcshopCatalogSyncReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  category: PcshopCatalogCategory;
  mode: PcshopCatalogSyncMode;
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

export async function runPcshopCatalogSync(options: PcshopCatalogSyncOptions): Promise<PcshopCatalogSyncReport> {
  const config = CATEGORY_CONFIGS[options.category];
  if (!config) throw new Error(`Unknown PCShop catalog category "${options.category}". Use phones or laptops.`);
  const startedAt = new Date();
  return withSyncLock(config, async () => {
    const snapshot =
      options.rawFile || options.mode === "validate" || options.mode === "promote"
        ? readSnapshot(config, options.rawFile)
        : await scrapeSnapshot(config, options);

    if (!snapshot.rawFile) {
      snapshot.rawFile = writeSnapshot(config, snapshot, options.rawDir);
    }

    const validation = await validateSnapshot(config, snapshot);
    const wantsPromotion = Boolean(options.promote || options.mode === "promote") && !options.dryRun;
    let promotion: PromotionReport | undefined;

    if (validation.hardFailures.length) {
      validation.promotionStatus = "failed";
    } else if (wantsPromotion) {
      promotion = await promoteSnapshot(config, snapshot);
      validation.promotionStatus = "success";
    } else {
      validation.promotionStatus = validation.warnings.length ? "requires_review" : "not_requested";
    }

    const finishedAt = new Date();
    const report: PcshopCatalogSyncReport = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      category: options.category,
      mode: options.mode,
      rawFile: snapshot.rawFile,
      discoveredCount: snapshot.products.length,
      importedCount: promotion?.totalImportedOrUpserted ?? 0,
      updatedCount: promotion?.totalUpdatedPrices ?? 0,
      failedCount: validation.hardFailures.length,
      skippedCount: promotion?.skippedCount ?? validation.missingPriceCount,
      promotionResult: validation.promotionStatus,
      warnings: validation.warnings,
      validation,
      promotion,
    };

    const reportFiles = writeReport(config, report, options.reportDir);
    report.reportFile = reportFiles.reportFile;
    report.latestReportFile = reportFiles.latestReportFile;
    if (validation.hardFailures.length && (options.promote || options.mode === "promote")) {
      throw new Error(`PCShop ${options.category} sync validation failed: ${validation.hardFailures.join("; ")}`);
    }
    return report;
  });
}

// ── Discovery ────────────────────────────────────────────────────────────────

async function scrapeSnapshot(config: CategoryConfig, options: PcshopCatalogSyncOptions): Promise<PcshopCatalogSnapshot> {
  const mode = options.mode === "full" ? "full" : options.mode === "prices" ? "prices" : "discover";
  const startedAt = new Date().toISOString();
  const listing = await discoverListing(config);

  return {
    version: 1,
    category: options.category,
    mode,
    sourceUrl: LISTING_API_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    listing: {
      firstBatchCount: listing.firstBatchCount,
      totalBatchesLoaded: listing.totalBatchesLoaded,
      totalPagesExpected: listing.totalPagesExpected,
      productsCountFromApi: listing.productsCountFromApi,
      totalUniqueProductUrls: listing.products.length,
      duplicateUrlCount: listing.duplicateUrlCount,
      failedListingUrls: listing.failedListingUrls,
      listingExhausted: listing.totalBatchesLoaded >= listing.totalPagesExpected && listing.failedListingUrls.length === 0,
    },
    products: listing.products,
  };
}

async function discoverListing(config: CategoryConfig) {
  const firstPageResult = await fetchListingPage(config, 1);
  const productsCountFromApi = firstPageResult.total;
  const totalPagesExpected = Math.max(1, firstPageResult.totalPages);
  const allProducts: Array<{ product: WooProduct; page: number }> = firstPageResult.products.map((p) => ({ product: p, page: 1 }));
  const failedListingUrls: string[] = [];

  for (let page = 2; page <= totalPagesExpected; page += 1) {
    await sleep(MIN_REQUEST_DELAY_MS);
    try {
      const result = await fetchListingPage(config, page);
      allProducts.push(...result.products.map((p) => ({ product: p, page })));
    } catch (error) {
      failedListingUrls.push(`${buildPageUrl(config, page)}: ${errorMessage(error)}`);
    }
  }

  const unique = new Map<string, StagedPcshopCatalogItem>();
  let duplicateUrlCount = 0;

  for (const item of allProducts) {
    const staged = stagedFromListing(config, item.product, item.page);
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

async function fetchListingPage(config: CategoryConfig, page: number): Promise<{ products: WooProduct[]; total: number; totalPages: number }> {
  const response = await fetchWithRetry(buildPageUrl(config, page), {
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

function buildPageUrl(config: CategoryConfig, page: number) {
  const url = new URL(LISTING_API_URL);
  url.searchParams.set("category", String(config.wooCategoryId));
  url.searchParams.set("per_page", String(PAGE_LIMIT));
  url.searchParams.set("page", String(page));
  return url.toString();
}

// ── Staging ──────────────────────────────────────────────────────────────────

function stagedFromListing(config: CategoryConfig, product: WooProduct, listingPage: number): StagedPcshopCatalogItem {
  const productUrl = product.permalink ?? "";
  const title = String(product.name ?? "").trim();
  const { currentPriceGel, oldPriceGel } = parseWooPrices(product.prices);
  const discountAmountGel = computeDiscountAmount(currentPriceGel, oldPriceGel);
  const discountPct = computeDiscountPercent(currentPriceGel, oldPriceGel);
  const imageUrl = product.images?.[0]?.src ? String(product.images[0].src) : undefined;
  const allImages = product.images?.map((img) => img.src).filter((src): src is string => Boolean(src)) ?? [];
  const attributes = attributeMap(product);
  const normalizedSpecs = normalizeCatalogSpecs(title, attributes);
  const specDescription = buildSpecDescription(normalizedSpecs, attributes);
  const id: string | null = product.id != null ? String(product.id) : null;
  const uniqueKey = id
    ? `${STORE}:${config.sourceCategory}:${id}`
    : `${STORE}:${config.sourceCategory}:${stableHash(productUrl)}`;

  return {
    store: STORE,
    source: SOURCE,
    sourceCategory: config.sourceCategory,
    category: config.sourceCategory,
    fasmetriCategorySlug: config.fasmetriCategory,
    uniqueKey,
    externalId: id,
    productCode: normalizedSpecs.partNumber ?? product.sku ?? undefined,
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
    specDescription,
    allImages,
    rawSpecs: { source: SOURCE, sourceCategory: config.sourceCategory, wooId: product.id, sku: product.sku, attributes },
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

// Flatten Store API taxonomy attributes ({name, terms: [{name}]}) into a
// simple label → value map. Multi-term attributes join with ", ".
function attributeMap(product: WooProduct): Record<string, string> {
  const map: Record<string, string> = {};
  for (const attr of product.attributes ?? []) {
    const label = String(attr.name ?? "").trim();
    if (!label) continue;
    const value = Array.isArray(attr.terms)
      ? attr.terms
          .map((term) => String(term?.name ?? "").trim())
          .filter(Boolean)
          .join(", ")
      : typeof attr.value === "string"
        ? attr.value.trim()
        : "";
    if (value) map[label] = cleanAttrValue(value);
  }
  return map;
}

function cleanAttrValue(value: string) {
  return value
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(attributes: Record<string, string>, ...labels: string[]) {
  for (const label of labels) {
    const hit = Object.entries(attributes).find(([key]) => key.toLowerCase() === label.toLowerCase());
    if (hit?.[1]) return hit[1];
  }
  return undefined;
}

function normalizeCatalogSpecs(title: string, attributes: Record<string, string>): NormalizedCatalogSpecs {
  const brand = attr(attributes, "Brand");
  const model = attr(attributes, "Model");
  const partNumber = attr(attributes, "Part Number");
  const color = attr(attributes, "Color");
  const operatingSystem = attr(attributes, "Operating System");

  const ramRaw = attr(attributes, "Memory Capacity", "RAM");
  const ramGb = parseGb(ramRaw) ?? undefined;

  const storageRaw = attr(attributes, "Storage Capacity", "Internal Storage", "Storage");
  const storageGb = parseGb(storageRaw) ?? undefined;
  const storageTypeRaw = attr(attributes, "Storage Type");
  const storageType = storageTypeRaw ? (/nvme|ssd/i.test(storageTypeRaw) ? "SSD" : /emmc/i.test(storageTypeRaw) ? "eMMC" : /hdd/i.test(storageTypeRaw) ? "HDD" : undefined) : undefined;

  const screenRaw = attr(attributes, "Screen Size", "Display Size");
  const screenSize = screenRaw?.match(/(\d{1,2}(?:\.\d)?)/)?.[1];

  // Processor Model strings carry frequency + core/cache noise
  // ("i5-13420H 2.1~4.6GHz (8 Cores...)"); keep only the chip token.
  const cpuRaw = attr(attributes, "Processor Model") ?? attr(attributes, "Processor Type", "Processor", "Chipset");
  const cpu = cpuRaw
    ?.replace(/\(.*?\)/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*[~-]\s*\d+(?:\.\d+)?\s*ghz\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*ghz\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const gpu = attr(attributes, "Graphics", "GPU");

  const releaseYearRaw = attr(attributes, "Release Year");
  const releaseYear = releaseYearRaw ? Number.parseInt(releaseYearRaw, 10) : undefined;

  // Fall back to the title for storage when attributes miss it (common for
  // phones where "128GB" only appears in the name).
  const titleStorage = storageGb ?? parseGb(title.match(/\b(\d{2,4}\s*(?:gb|tb))\b/i)?.[1]);

  return {
    brand,
    model,
    partNumber,
    storageGb: storageGb ?? titleStorage,
    storageType,
    ramGb,
    screenSize,
    cpu: cpu || undefined,
    gpu,
    color,
    operatingSystem,
    releaseYear: Number.isFinite(releaseYear) ? releaseYear : undefined,
  };
}

function parseGb(value?: string): number | undefined {
  if (!value) return undefined;
  const tb = value.match(/(\d+(?:\.\d+)?)\s*tb/i);
  if (tb) return Math.round(Number(tb[1]) * 1024);
  const gb = value.match(/(\d{1,4})\s*gb/i);
  if (gb) return Number(gb[1]);
  return undefined;
}

// Free-text spec blob the safe matcher's variant extractor reads. RAM, storage
// and screen are emitted with the adjacency keywords ("RAM", "SSD"/"Storage",
// "inch") its proximity regexes require.
function buildSpecDescription(specs: NormalizedCatalogSpecs, attributes: Record<string, string>): string | undefined {
  const parts: string[] = [];
  if (specs.ramGb) parts.push(`${specs.ramGb}GB RAM`);
  if (specs.storageGb) parts.push(specs.storageType ? `${specs.storageGb}GB ${specs.storageType} Storage` : `${specs.storageGb}GB Storage`);
  if (specs.screenSize) parts.push(`${specs.screenSize} inch`);
  if (specs.cpu) parts.push(specs.cpu);
  if (specs.gpu) parts.push(specs.gpu);
  if (specs.model) parts.push(specs.model);
  if (specs.partNumber) parts.push(specs.partNumber);
  if (specs.color) parts.push(specs.color);
  if (specs.operatingSystem) parts.push(specs.operatingSystem);
  const sim = attr(attributes, "Dual SIM", "SIM");
  if (sim && !/no/i.test(sim)) parts.push("Dual SIM");
  const text = parts.filter(Boolean).join(". ").trim();
  return text.length > 0 ? text : undefined;
}

// ── Validation ───────────────────────────────────────────────────────────────

async function validateSnapshot(config: CategoryConfig, snapshot: PcshopCatalogSnapshot): Promise<ValidationReport> {
  const urls = new Set<string>();
  const keys = new Set<string>();
  let duplicateUniqueKeyCount = 0;
  let missingTitleCount = 0;
  let missingPriceCount = 0;
  let missingImageCount = 0;
  let missingBrandCount = 0;
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
    if (!product.brand) missingBrandCount += 1;
    if (product.store !== STORE) invalidStoreCount += 1;
    if (product.source !== SOURCE) invalidSourceCount += 1;
    if (product.category !== config.sourceCategory || product.fasmetriCategorySlug !== config.fasmetriCategory) invalidCategoryCount += 1;
    if (!isPcshopUrl(product.productUrl)) invalidPcshopUrlCount += 1;
  }

  const oldActiveCount = await activeOfferCount(config);
  const hardFailures: string[] = [];
  const warnings: string[] = [];
  const productCount = snapshot.products.length;

  if (duplicateUniqueKeyCount) hardFailures.push(`${duplicateUniqueKeyCount} duplicate unique keys detected.`);
  if (invalidPcshopUrlCount) hardFailures.push(`${invalidPcshopUrlCount} product URLs are not from pcshop.ge.`);
  if (invalidStoreCount) hardFailures.push(`${invalidStoreCount} products have an invalid store.`);
  if (invalidSourceCount) hardFailures.push(`${invalidSourceCount} products have an invalid source.`);
  if (invalidCategoryCount) hardFailures.push(`${invalidCategoryCount} products have an invalid category.`);
  if (!snapshot.listing.listingExhausted) hardFailures.push("PCShop listing pages were not fully exhausted.");
  if (productCount === 0) hardFailures.push("PCShop listing returned zero products.");
  if (oldActiveCount > 0 && productCount < Math.floor(oldActiveCount * LOW_COUNT_RATIO)) {
    hardFailures.push(`New scraped count ${productCount} is suspiciously lower than old active count ${oldActiveCount}.`);
  }
  if (missingPriceCount > Math.max(5, Math.ceil(productCount * MAX_MISSING_PRICE_RATIO))) {
    hardFailures.push(`${missingPriceCount} products are missing prices.`);
  }

  if (missingImageCount) warnings.push(`${missingImageCount} products are missing images.`);
  if (missingBrandCount) warnings.push(`${missingBrandCount} products are missing a brand attribute.`);
  if (snapshot.listing.failedListingUrls.length) warnings.push(`${snapshot.listing.failedListingUrls.length} listing pages failed.`);

  return {
    totalListingProductsDiscovered: snapshot.listing.productsCountFromApi,
    totalUniqueProductUrls: productCount,
    duplicateUrlCount: snapshot.listing.duplicateUrlCount,
    missingTitleCount,
    missingPriceCount,
    missingImageCount,
    missingBrandCount,
    invalidStoreCount,
    invalidSourceCount,
    invalidCategoryCount,
    invalidPcshopUrlCount,
    duplicateUniqueKeyCount,
    oldActiveOfferCount: oldActiveCount,
    newScrapedCount: productCount,
    promotionStatus: "not_requested",
    hardFailures,
    warnings,
  };
}

// ── Promotion ────────────────────────────────────────────────────────────────

async function promoteSnapshot(config: CategoryConfig, snapshot: PcshopCatalogSnapshot): Promise<PromotionReport> {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  await assertSyncSchemaReady();
  const shop = await db.shop.upsert({
    where: { slug: STORE },
    update: { name: "PCShop", baseUrl: STORE_BASE_URL, enabled: true, needsConfiguration: false },
    create: { slug: STORE, name: "PCShop", baseUrl: STORE_BASE_URL, enabled: true, needsConfiguration: false },
  });
  const category = await db.category.upsert({
    where: { slug: config.fasmetriCategory },
    update: {},
    create: { slug: config.fasmetriCategory, nameKa: config.fasmetriCategory, nameEn: config.fasmetriCategory },
  });

  const existingOffers = await existingOfferStateByUrl(config, shop.id);
  const liveUrls = new Set(snapshot.products.map((item) => item.productUrl));
  let totalImportedOrUpserted = 0;
  let totalUpdatedPrices = 0;
  let totalNewProducts = 0;
  let skippedCount = 0;
  let priceAnomalyCount = 0;

  for (const item of snapshot.products) {
    if (item.currentPriceGel == null || !item.originalTitle) {
      skippedCount += 1;
      await upsertRawOffer(config, shop.id, item);
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
        `[pcshop-${snapshot.category}] Price anomaly: "${item.originalTitle}" ${existingPrice} -> ${currentPriceGel} GEL, keeping old price (${item.productUrl})`,
      );
      await recordPriceAnomaly(db, {
        store: STORE,
        category: config.sourceCategory,
        offerUrl: item.productUrl,
        title: item.originalTitle,
        previousPrice: existingPrice,
        newPrice: currentPriceGel,
      });
    }
    const priceChanged = !priceAnomalous && (existingPrice !== currentPriceGel || existingOldPrice !== item.oldPriceGel);
    const saleDetectedAt = item.discountPercent > 0 ? existing?.saleDetectedAt ?? new Date() : null;

    const rawOffer = await upsertRawOffer(config, shop.id, item);
    let offerExternalId: string | null = item.externalId ?? null;

    const runTransaction = () =>
      db.$transaction(async (tx) => {
        const product = await upsertStandaloneProduct(tx, config, category.id, item, existing?.id);
        const offer = await tx.productOffer.upsert({
          where: { shopId_url: { shopId: shop.id, url: item.productUrl } },
          update: {
            productId: product.id,
            rawOfferId: rawOffer.id,
            externalId: offerExternalId,
            title: item.originalTitle,
            canonicalKey: item.uniqueKey,
            productIdentity: jsonValue(productIdentityFor(config, item)),
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
            productIdentity: jsonValue(productIdentityFor(config, item)),
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

  const removalResult = await markMissingOffers(config, existingOffers, liveUrls);
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

async function upsertStandaloneProduct(
  tx: Prisma.TransactionClient,
  config: CategoryConfig,
  categoryId: string,
  item: StagedPcshopCatalogItem,
  existingOfferId?: string,
) {
  if (existingOfferId) {
    const existingOffer = await tx.productOffer.findUnique({ where: { id: existingOfferId }, select: { productId: true } });
    if (existingOffer?.productId) {
      return tx.product.update({
        where: { id: existingOffer.productId },
        data: productData(config, categoryId, item),
      });
    }
  }

  const existing = await tx.product.findFirst({ where: { canonicalKey: item.uniqueKey } });
  if (existing) return tx.product.update({ where: { id: existing.id }, data: productData(config, categoryId, item) });

  const slug = stableProductSlug(item);
  try {
    return await tx.product.create({
      data: {
        ...productData(config, categoryId, item),
        slug,
      } as Prisma.ProductUncheckedCreateInput,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return tx.product.create({
        data: {
          ...productData(config, categoryId, item),
          slug: `${slug}-${stableHash(item.uniqueKey).slice(0, 6)}`,
        } as Prisma.ProductUncheckedCreateInput,
      });
    }
    throw error;
  }
}

function productData(config: CategoryConfig, categoryId: string, item: StagedPcshopCatalogItem) {
  return {
    name: item.originalTitle,
    normalizedName: normalizeProductName(item.originalTitle),
    canonicalKey: item.uniqueKey,
    productIdentity: jsonValue(productIdentityFor(config, item)),
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    imageUrl: item.imageUrl,
    categoryId,
    categoryConfidence: 100,
    categoryNeedsReview: false,
    categorySuggestedSlug: config.fasmetriCategory,
    categoryReason: `PCShop ${config.sourceCategory} category listing (Woo term ${config.wooCategoryId}) validated this source URL.`,
    categoryMatchedRules: jsonValue([`pcshop-${config.sourceCategory}-category`]),
    categorySourceSignals: jsonValue({
      store: STORE,
      sourceCategory: config.sourceCategory,
      sourceUrl: LISTING_API_URL,
      productUrl: item.productUrl,
    }),
    isPublic: true,
    needsReview: false,
    archivedAt: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;
}

async function upsertRawOffer(config: CategoryConfig, shopId: string, item: StagedPcshopCatalogItem) {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  let externalId: string | null = item.externalId ?? null;
  const data = {
    externalId,
    originalTitle: item.originalTitle,
    originalImageUrl: item.imageUrl,
    rawPrice: item.currentPriceGel,
    rawOldPrice: item.oldPriceGel,
    rawDiscount: item.discountPercent,
    availability: item.availability,
    rawCategory: config.sourceCategory,
    sourceCategory: config.sourceCategory,
    breadcrumbs: jsonValue([config.sourceCategory, item.productUrl]),
    sourceBreadcrumbs: jsonValue([config.sourceCategory, item.productUrl]),
    description: item.specDescription,
    imageAlt: undefined,
    rawSpecsJson: jsonValue(rawSpecsPayload(config, item)),
    importBatchId: `${config.slugPrefix}:${item.scrapedAt.slice(0, 10)}`,
    storeKey: STORE,
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    normalizedTitle: normalizeProductTitle(item.originalTitle),
    cleanTitle: removeNoiseWords(item.originalTitle),
    canonicalKey: item.uniqueKey,
    productIdentity: jsonValue(productIdentityFor(config, item)),
    categorySlug: config.fasmetriCategory,
    categoryConfidence: 100,
    categoryNeedsReview: false,
    status: "NORMALIZED" as const,
    scrapedAt: new Date(item.scrapedAt),
    processedAt: new Date(),
    errorMessage: null,
  };

  const upsert = () =>
    db.rawOffer.upsert({
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

async function markMissingOffers(config: CategoryConfig, existingOffers: Map<string, ExistingOfferState>, liveUrls: Set<string>) {
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
            ? `Not present in ${INACTIVE_MISS_THRESHOLD} consecutive PCShop ${config.sourceCategory} syncs.`
            : `Possibly removed: not present in latest PCShop ${config.sourceCategory} listing.`,
          processedAt: now,
        },
      });
    }
    if (inactive) markedInactive += 1;
  }

  return { possiblyRemoved, markedInactive };
}

// Existing pcshop offers in this fasmetri category. Scoped to the category so
// syncing laptops never touches (or "removes") console/phone offers. Unlike
// the consoles module we do NOT require categoryNeedsReview=false — offers
// created by the old HTML scraper may still carry review flags, and skipping
// them here would fork duplicate products for the same URL.
async function existingOfferStateByUrl(config: CategoryConfig, shopId: string) {
  if (!db) return new Map<string, ExistingOfferState>();
  const offers = await db.productOffer.findMany({
    where: {
      shopId,
      product: {
        OR: [
          { categorySuggestedSlug: config.fasmetriCategory },
          { category: { slug: config.fasmetriCategory } },
          { manualCategory: { slug: config.fasmetriCategory } },
        ],
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

async function activeOfferCount(config: CategoryConfig) {
  if (!db) return 0;
  const where = {
    shop: { slug: STORE },
    product: {
      OR: [{ categorySuggestedSlug: config.fasmetriCategory }, { category: { slug: config.fasmetriCategory } }],
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

// ── Schema guard ─────────────────────────────────────────────────────────────

async function assertSyncSchemaReady() {
  if (!db) return;
  try {
    await db.productOffer.findFirst({ select: { id: true, isActive: true, missedSyncCount: true }, take: 1 });
  } catch (error) {
    if (isMissingColumnError(error)) {
      throw new Error("PCShop catalog sync schema is not deployed. Run npm run db:deploy before promotion.");
    }
    throw error;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPcshopUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname === "pcshop.ge";
  } catch {
    return false;
  }
}

function stableProductSlug(item: StagedPcshopCatalogItem) {
  const base = slugifyProduct(item.originalTitle);
  const id = item.externalId ?? stableHash(item.productUrl).slice(0, 8);
  return `${base}-pcshop-${id}`;
}

function stableHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function rawSpecsPayload(config: CategoryConfig, item: StagedPcshopCatalogItem) {
  return {
    source: SOURCE,
    sourceCategory: config.sourceCategory,
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
    rawSpecs: item.rawSpecs,
    normalizedSpecs: item.normalizedSpecs,
  };
}

function productIdentityFor(config: CategoryConfig, item: StagedPcshopCatalogItem) {
  return {
    productType: config.productType,
    categorySlug: config.fasmetriCategory,
    sourceCategory: config.sourceCategory,
    source: SOURCE,
    store: STORE,
    uniqueKey: item.uniqueKey,
    externalId: item.externalId,
    productCode: item.productCode,
    brand: item.normalizedSpecs.brand ?? item.brand,
    model: item.normalizedSpecs.model,
    storageGb: item.normalizedSpecs.storageGb,
    ramGb: item.normalizedSpecs.ramGb,
    color: item.normalizedSpecs.color,
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

function readSnapshot(config: CategoryConfig, rawFile?: string): PcshopCatalogSnapshot {
  const file = rawFile ? resolve(rawFile) : resolve(defaultRawDir(config), `${config.slugPrefix}-sync-latest.json`);
  if (!existsSync(file)) throw new Error(`Raw snapshot does not exist: ${file}`);
  return JSON.parse(readFileSync(file, "utf8")) as PcshopCatalogSnapshot;
}

function writeSnapshot(config: CategoryConfig, snapshot: PcshopCatalogSnapshot, rawDir?: string) {
  const dir = writableDir(config, rawDir ?? defaultRawDir(config));
  const timestamp = timestampForFile(new Date());
  const file = join(dir, `${config.slugPrefix}-sync-${timestamp}.json`);
  const latest = join(dir, `${config.slugPrefix}-sync-latest.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2));
  writeFileSync(latest, JSON.stringify({ ...snapshot, rawFile: file }, null, 2));
  return file;
}

function writeReport(config: CategoryConfig, report: PcshopCatalogSyncReport, reportDir?: string) {
  const dir = writableDir(config, reportDir ?? "reports");
  const timestamp = timestampForFile(new Date(report.finishedAt));
  const reportFile = join(dir, `${config.slugPrefix}-sync-${timestamp}.json`);
  const latestReportFile = join(dir, `${config.slugPrefix}-sync-latest.json`);
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  writeFileSync(latestReportFile, JSON.stringify({ ...report, reportFile, latestReportFile }, null, 2));
  return { reportFile, latestReportFile };
}

function defaultRawDir(config: CategoryConfig) {
  return join(".codex-logs", config.slugPrefix, "raw");
}

function writableDir(config: CategoryConfig, preferred: string) {
  try {
    mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const fallback = join(tmpdir(), `fasmetri-${config.slugPrefix}-sync`, preferred.replace(/[:\\/]+/g, "-"));
    mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function timestampForFile(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function withSyncLock<T>(config: CategoryConfig, callback: () => Promise<T>) {
  const lockPath = join(".codex-logs", `${config.slugPrefix}-sync.lock`);
  acquireFileLock(config, lockPath);
  let dbLocked = false;
  try {
    if (db) {
      const rows = await db.$queryRawUnsafe<Array<{ locked: boolean }>>(`SELECT pg_try_advisory_lock(${config.advisoryLockId}) AS locked`);
      dbLocked = Boolean(rows[0]?.locked);
      if (!dbLocked) throw new Error(`Another PCShop ${config.sourceCategory} sync is already running.`);
    }
    return await callback();
  } finally {
    if (db && dbLocked) await db.$queryRawUnsafe(`SELECT pg_advisory_unlock(${config.advisoryLockId})`);
    releaseFileLock(lockPath);
  }
}

function acquireFileLock(config: CategoryConfig, path: string) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    const current = JSON.parse(readFileSync(path, "utf8")) as { startedAt?: string };
    const startedAt = current.startedAt ? Date.parse(current.startedAt) : 0;
    if (Number.isFinite(startedAt) && Date.now() - startedAt < 6 * 60 * 60 * 1000) {
      throw new Error(`Another PCShop ${config.sourceCategory} sync lock is active.`);
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
