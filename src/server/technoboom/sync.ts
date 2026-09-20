import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { OfferAvailability } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveRawOffer } from "@/server/scrapers/runner";
import type { ScrapedOffer } from "@/server/scrapers/types";
import { createImportBatch } from "@/lib/importPipeline";
import type { FasmetriCategorySlug } from "@/config/categoryMapping";

// TechnoBoom (technoboom.ge) ingestion over the store's own JSON API.
//
// The storefront is a client-rendered Next.js app with no sitemap and no
// server-rendered product markup, so the HTML ShopAdapter path cannot see a
// single product. Its Azure backend, however, publishes the whole catalogue
// unauthenticated:
//
//   GET /api/Items/web-items-short            -> every item, one call
//   GET /api/Items/web/{id}                   -> one item + spec dimensions
//   GET /api/Categories/web-categories        -> taxonomy
//
// So discovery is exact rather than best-effort: the listing call IS the
// catalogue, which also makes delisting detection reliable (an item missing
// from a full snapshot is genuinely gone).
//
// This module is raw-only on purpose. It writes RawOffer rows through the
// shared `saveRawOffer` (same function the HTML scrapers use), which runs the
// standard categorizer + identity extractor, and then the normal pipeline
// takes over:
//   normalize-raw-offers -> match-offers-to-variants -> recategorize-products
// That is what puts a TechnoBoom price next to the other shops' prices on a
// product page, so nothing here matches or promotes products by itself.

const STORE = "technoboom";
const REPORT_KEY = "technoboom-catalog";
const STORE_NAME = "TechnoBoom";
const STORE_BASE_URL = "https://www.technoboom.ge";
const API_BASE = "https://technoboomapp-fsf3eybnbugkfsf0.canadacentral-01.azurewebsites.net/api";
const LISTING_URL = `${API_BASE}/Items/web-items-short`;
const CATEGORIES_URL = `${API_BASE}/Categories/web-categories`;
const IMAGE_BASE = "https://technoboomwebadmin.blob.core.windows.net";

const USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const DETAIL_REQUEST_DELAY_MS = 120;
const DETAIL_CONCURRENCY = 4;
const LOW_COUNT_RATIO = 0.7;
const MAX_MISSING_PRICE_RATIO = 0.1;
const INACTIVE_MISS_THRESHOLD = 3;
// Lock IDs in use: 85520260605 (zoommer-phones), 53120260605 (zoommer-laptops),
//                  37720260605 (ee-phones), 5820260605 (ee-laptops),
//                  90000000001..3 (pcshop consoles/phones/laptops).
const ADVISORY_LOCK_ID = 90000000010;

const GEORGIAN_LETTER = /[Ⴀ-ჿ]/;

// ── TechnoBoom taxonomy → Fasmetri categories ────────────────────────────────
// Keyed by `${mainCategoryId}:${categoryId}` first (categoryId 5 is reused by
// two main categories: free-standing vs built-in electric ovens), then by bare
// categoryId. Only `televisions` is a public Fasmetri category today — every
// other bucket is classifier-internal, so those offers stay out of the public
// catalogue exactly like the other stores' non-public stock.
const CATEGORY_BY_MAIN_AND_CATEGORY: Record<string, FasmetriCategorySlug> = {
  "5:5": "small-appliances", // free-standing electric oven
  "6:5": "home-appliances", // built-in electric oven
};

const CATEGORY_BY_ID: Record<number, FasmetriCategorySlug> = {
  25: "televisions", // ტელევიზორი
  23: "tv-mounts", // ტელევიზორის საკიდი
  16: "computers", // პერსონალური კომპიუტერი
  17: "monitors", // კომპიუტერის მონიტორი
  19: "computer-accessories", // კომპიუტერის პერიფერია
  21: "refrigerators", // მაცივარი
  27: "washing-machines", // სარეცხი მანქანა
  4: "washing-machines", // საშრობი (tumble dryer)
  3: "home-appliances", // ჭურჭლის სარეცხი მანქანა
  15: "home-appliances", // გაზქურა
  7: "home-appliances", // გაზქურის ზედაპირი
  8: "home-appliances", // გამწოვი
  26: "home-appliances", // მტვერსასრუტი
  39: "home-appliances", // საცხობი ღუმელი
  1: "home-appliances", // კონდიციონერი
  6: "home-appliances", // გათბობა-გაგრილება
  13: "small-appliances", // მიკროტალღური
  9: "small-appliances", // სამზარეულოს ტექნიკა
  5: "small-appliances", // ელექტრო ღუმელი
  20: "beauty", // პირადი მოვლის ტექნიკა
  37: "home-garden", // ნათურები
};

const FALLBACK_CATEGORY: FasmetriCategorySlug = "other";

export type TechnoboomSyncMode = "discover" | "full" | "prices" | "validate" | "promote";

export type TechnoboomSyncOptions = {
  mode: TechnoboomSyncMode;
  promote?: boolean;
  dryRun?: boolean;
  limit?: number;
  offset?: number;
  /** Ingest only items that map to this Fasmetri category slug. */
  category?: string;
  rawFile?: string;
  rawDir?: string;
  reportDir?: string;
};

// ── TechnoBoom API shapes (the subset we read) ───────────────────────────────

type TechnoboomDimension = {
  id: number;
  itemId: number;
  categoryDimensionId: number;
  categoryDimensionName: string;
  categoryDimensionValueId: number;
  categoryDimensionValueName: string;
  isFilter: boolean;
};

type TechnoboomDimensionGroup = {
  groupId: number | null;
  groupName: string | null;
  dimensions: TechnoboomDimension[];
};

type TechnoboomItem = {
  id: number;
  /** Store SKU, e.g. "I31756". */
  no: string;
  /** TechnoBoom stores the model code here — there is no separate name field. */
  description: string;
  fullDescription?: string | null;
  brandId: number;
  brandName: string;
  mainCategoryId: number;
  mainCategoryName: string;
  categoryId: number;
  categoryName: string;
  subCategoryId: number;
  subCategoryName: string;
  itemTrackingId?: number;
  itemTrackingName?: string;
  priceRetail: number;
  discountPercent: number;
  realPriceRetail: number;
  qvt: number;
  mainDimensions?: TechnoboomDimension[];
  itemDimensionGroups?: TechnoboomDimensionGroup[];
  itemImageUrls?: string[];
  imageUrl?: string | null;
};

export type StagedTechnoboomItem = {
  store: typeof STORE;
  itemId: number;
  sku: string;
  uniqueKey: string;
  externalId: string;
  productUrl: string;
  title: string;
  brand: string;
  model: string;
  fasmetriCategorySlug: FasmetriCategorySlug;
  sourceCategory: string;
  breadcrumbs: string[];
  imageUrl?: string;
  allImages: string[];
  currentPriceGel: number | null;
  oldPriceGel: number | null;
  discountPercent: number;
  availability: OfferAvailability;
  specDescription?: string;
  specs: Record<string, string>;
  detailFetched: boolean;
  scrapedAt: string;
};

export type TechnoboomSnapshot = {
  version: 1;
  store: typeof STORE;
  mode: "discover" | "full" | "prices";
  sourceUrl: typeof LISTING_URL;
  startedAt: string;
  finishedAt?: string;
  listing: {
    itemsFromApi: number;
    itemsAfterFilter: number;
    uniqueProductUrls: number;
    duplicateUrlCount: number;
    detailFetchCount: number;
    failedDetailIds: number[];
    categoryCounts: Record<string, number>;
  };
  products: StagedTechnoboomItem[];
  rawFile?: string;
};

type ValidationReport = {
  itemsFromApi: number;
  totalUniqueProductUrls: number;
  duplicateUrlCount: number;
  duplicateUniqueKeyCount: number;
  missingTitleCount: number;
  missingPriceCount: number;
  missingImageCount: number;
  missingBrandCount: number;
  invalidUrlCount: number;
  uncategorizedCount: number;
  publicCategoryCount: number;
  oldActiveRawOfferCount: number;
  newScrapedCount: number;
  promotionStatus: "success" | "failed" | "requires_review" | "not_requested";
  hardFailures: string[];
  warnings: string[];
};

type PromotionReport = {
  rawOffersWritten: number;
  rawOffersCreated: number;
  rawOffersUpdated: number;
  skippedCount: number;
  delistedRawOffers: number;
  offersMarkedOutOfStock: number;
  offersMarkedInactive: number;
};

export type TechnoboomSyncReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  store: typeof STORE;
  mode: TechnoboomSyncMode;
  rawFile?: string;
  reportFile?: string;
  latestReportFile?: string;
  discoveredCount: number;
  importedCount: number;
  /** Raw offers that already existed and were refreshed — read by log-sync.ts. */
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  promotionResult: ValidationReport["promotionStatus"];
  categoryCounts: Record<string, number>;
  warnings: string[];
  validation: ValidationReport;
  promotion?: PromotionReport;
};

const db = prisma;

export async function runTechnoboomSync(options: TechnoboomSyncOptions): Promise<TechnoboomSyncReport> {
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
      promotion = await promoteSnapshot(snapshot, options);
      validation.promotionStatus = "success";
    } else {
      validation.promotionStatus = validation.warnings.length ? "requires_review" : "not_requested";
    }

    const finishedAt = new Date();
    const report: TechnoboomSyncReport = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      store: STORE,
      mode: options.mode,
      rawFile: snapshot.rawFile,
      discoveredCount: snapshot.products.length,
      importedCount: promotion?.rawOffersWritten ?? 0,
      updatedCount: promotion?.rawOffersUpdated ?? 0,
      skippedCount: promotion?.skippedCount ?? validation.missingPriceCount,
      failedCount: validation.hardFailures.length,
      promotionResult: validation.promotionStatus,
      categoryCounts: snapshot.listing.categoryCounts,
      warnings: validation.warnings,
      validation,
      promotion,
    };

    const reportFiles = writeReport(report, options.reportDir);
    report.reportFile = reportFiles.reportFile;
    report.latestReportFile = reportFiles.latestReportFile;

    if (validation.hardFailures.length && (options.promote || options.mode === "promote")) {
      throw new Error(`TechnoBoom sync validation failed: ${validation.hardFailures.join("; ")}`);
    }
    return report;
  });
}

// ── Discovery ────────────────────────────────────────────────────────────────

async function scrapeSnapshot(options: TechnoboomSyncOptions): Promise<TechnoboomSnapshot> {
  const mode = options.mode === "full" ? "full" : options.mode === "prices" ? "prices" : "discover";
  const startedAt = new Date().toISOString();
  const items = await fetchListing();

  const filtered = items.filter((item) => {
    if (!options.category) return true;
    return fasmetriCategoryFor(item) === options.category;
  });

  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit && options.limit > 0 ? options.limit : filtered.length;
  const window = filtered.slice(offset, offset + limit);

  // `prices` skips the per-item detail call: the listing already carries price,
  // discount and stock, so a price refresh costs exactly one request. `full`
  // pays for the spec dimensions the variant matcher reads (diagonal,
  // resolution, colour, …).
  const wantsDetail = mode === "full";
  // A price-only pass must not wipe the spec sheet an earlier `full` pass
  // stored: saveRawOffer overwrites `description` every time, and a television
  // without a screen size drops out of variant matching entirely.
  const carried = wantsDetail ? new Map<number, StagedTechnoboomItem>() : previousSpecsByItemId(options.rawDir);
  const failedDetailIds: number[] = [];
  const staged: StagedTechnoboomItem[] = [];

  const detailed = wantsDetail ? await fetchDetails(window, failedDetailIds) : window;

  for (const [index, item] of detailed.entries()) {
    const entry = stageItem(item, wantsDetail && !failedDetailIds.includes(window[index].id));
    const previous = entry.detailFetched ? undefined : carried.get(window[index].id);
    if (previous?.specDescription) {
      entry.specs = previous.specs;
      entry.specDescription = previous.specDescription;
      entry.detailFetched = true;
    }
    staged.push(entry);
  }

  const unique = new Map<string, StagedTechnoboomItem>();
  let duplicateUrlCount = 0;
  for (const entry of staged) {
    if (unique.has(entry.productUrl)) {
      duplicateUrlCount += 1;
      continue;
    }
    unique.set(entry.productUrl, entry);
  }
  const products = [...unique.values()];

  const categoryCounts: Record<string, number> = {};
  for (const product of products) {
    categoryCounts[product.fasmetriCategorySlug] = (categoryCounts[product.fasmetriCategorySlug] ?? 0) + 1;
  }

  return {
    version: 1,
    store: STORE,
    mode,
    sourceUrl: LISTING_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    listing: {
      itemsFromApi: items.length,
      itemsAfterFilter: filtered.length,
      uniqueProductUrls: products.length,
      duplicateUrlCount,
      detailFetchCount: wantsDetail ? window.length - failedDetailIds.length : 0,
      failedDetailIds,
      categoryCounts,
    },
    products,
  };
}

// One detail call per item, ~1s each against the store's Azure backend — nearly
// 12 minutes if run one at a time over the whole catalogue. A small worker pool
// keeps a full pass to a few minutes while staying far below the request rate a
// browsing customer generates. Results stay in `window` order.
async function fetchDetails(window: TechnoboomItem[], failedDetailIds: number[]): Promise<TechnoboomItem[]> {
  const results = new Array<TechnoboomItem>(window.length);
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= window.length) return;
      const item = window[index];
      try {
        results[index] = (await fetchDetail(item.id)) ?? item;
      } catch {
        failedDetailIds.push(item.id);
        results[index] = item;
      }
      done += 1;
      if (done === 1 || done % 50 === 0 || done === window.length) {
        console.log(`[technoboom] fetching item specs ${done}/${window.length}`);
      }
      await sleep(DETAIL_REQUEST_DELAY_MS);
    }
  };

  await Promise.all(Array.from({ length: Math.min(DETAIL_CONCURRENCY, window.length) }, worker));
  return results;
}

function previousSpecsByItemId(rawDir?: string): Map<number, StagedTechnoboomItem> {
  try {
    const previous = readSnapshot(join(rawDir ?? defaultRawDir(), `${STORE}-sync-latest.json`));
    return new Map(previous.products.filter((product) => product.specDescription).map((product) => [product.itemId, product]));
  } catch {
    return new Map();
  }
}

async function fetchListing(): Promise<TechnoboomItem[]> {
  const response = await fetchWithRetry(LISTING_URL);
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) throw new Error("TechnoBoom listing API did not return an array.");
  return payload as TechnoboomItem[];
}

async function fetchDetail(itemId: number): Promise<TechnoboomItem | null> {
  const response = await fetchWithRetry(`${API_BASE}/Items/web/${itemId}?timestamp=${Date.now()}`);
  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object") return null;
  return payload as TechnoboomItem;
}

/** Exported for the store adapter's coverage report. */
export async function fetchTechnoboomCategories(): Promise<Array<{ mainCategoryId: number; categoryId: number; categoryName: string }>> {
  const response = await fetchWithRetry(CATEGORIES_URL);
  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as Array<{ mainCategoryId: number; categoryId: number; categoryName: string }>) : [];
}

// ── Staging ──────────────────────────────────────────────────────────────────

function stageItem(item: TechnoboomItem, detailFetched: boolean): StagedTechnoboomItem {
  const categorySlug = fasmetriCategoryFor(item);
  const specs = specMap(item);
  const title = buildTitle(item);
  const { currentPriceGel, oldPriceGel } = prices(item);
  const images = imageList(item);

  return {
    store: STORE,
    itemId: item.id,
    sku: String(item.no ?? "").trim(),
    uniqueKey: `${STORE}:${item.id}`,
    externalId: `${STORE}-${item.id}`,
    productUrl: productUrl(item),
    title,
    brand: String(item.brandName ?? "").trim(),
    model: String(item.description ?? "").trim(),
    fasmetriCategorySlug: categorySlug,
    sourceCategory: String(item.categoryName ?? "").trim(),
    breadcrumbs: [item.mainCategoryName, item.categoryName, item.subCategoryName].map((part) => String(part ?? "").trim()).filter(Boolean),
    imageUrl: images[0],
    allImages: images,
    currentPriceGel,
    oldPriceGel,
    discountPercent: computeDiscountPercent(currentPriceGel, oldPriceGel),
    // The API exposes `qvt` (stock quantity) rather than a stock flag; the
    // storefront treats a positive quantity as buyable.
    availability: Number(item.qvt) > 0 ? OfferAvailability.IN_STOCK : OfferAvailability.OUT_OF_STOCK,
    specDescription: buildSpecDescription(item, specs),
    specs,
    detailFetched,
    scrapedAt: new Date().toISOString(),
  };
}

// Product pages live under a four-segment route the storefront builds from the
// taxonomy ids: /maincategory=2/category=25/subcategory=95/item=604
function productUrl(item: TechnoboomItem) {
  return `${STORE_BASE_URL}/maincategory=${item.mainCategoryId}/category=${item.categoryId}/subcategory=${item.subCategoryId}/item=${item.id}`;
}

// TechnoBoom has no product-name field: the storefront's card stacks
// categoryName / brandName / subCategoryName / description(model code). The
// Georgian product noun is the subcategory when it is a noun ("უთო") and the
// category otherwise (TV subcategories are panel types — "LED", "QLED").
function buildTitle(item: TechnoboomItem) {
  const subCategory = String(item.subCategoryName ?? "").trim();
  const category = String(item.categoryName ?? "").trim();
  const noun = GEORGIAN_LETTER.test(subCategory) ? subCategory : category;
  return [noun, String(item.brandName ?? "").trim(), String(item.description ?? "").trim()]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function fasmetriCategoryFor(item: TechnoboomItem): FasmetriCategorySlug {
  return (
    CATEGORY_BY_MAIN_AND_CATEGORY[`${item.mainCategoryId}:${item.categoryId}`] ??
    CATEGORY_BY_ID[item.categoryId] ??
    FALLBACK_CATEGORY
  );
}

function prices(item: TechnoboomItem): { currentPriceGel: number | null; oldPriceGel: number | null } {
  const real = toPrice(item.realPriceRetail);
  const retail = toPrice(item.priceRetail);
  const currentPriceGel = real ?? retail;
  const oldPriceGel = retail != null && currentPriceGel != null && retail > currentPriceGel ? retail : null;
  return { currentPriceGel, oldPriceGel };
}

function toPrice(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
}

function computeDiscountPercent(price: number | null, oldPrice: number | null) {
  if (price == null || oldPrice == null || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

// Flatten every spec dimension (both the filterable `mainDimensions` and the
// grouped spec sheet) into label -> value. Detail-only; `prices` runs leave
// this empty and the earlier NORMALIZED spec text on the row stands.
function specMap(item: TechnoboomItem): Record<string, string> {
  const specs: Record<string, string> = {};
  const push = (dimension: TechnoboomDimension) => {
    const label = String(dimension?.categoryDimensionName ?? "").trim();
    const value = String(dimension?.categoryDimensionValueName ?? "").replace(/\s+/g, " ").trim();
    if (label && value) specs[label] = value;
  };
  for (const dimension of item.mainDimensions ?? []) push(dimension);
  for (const group of item.itemDimensionGroups ?? []) {
    for (const dimension of group?.dimensions ?? []) push(dimension);
  }
  return specs;
}

const DIAGONAL_LABELS = ["დიაგონალი", "ეკრანის ზომა"];

// The spec sheet is also the matcher's input signal, and two things go wrong if
// it is pasted in raw:
//
//  * `productNormalization.modelCodes()` accepts any 5+ character token that
//    mixes letters and digits, so values like "60HZ." or "3840x2160" outrank the
//    real model code from the title and the product gets keyed on its refresh
//    rate. Splitting every letter/digit run inside such a token defuses it while
//    leaving the text readable.
//  * its screen-size regex only accepts `inch`/`in`/`"` immediately before a
//    space or end of string, so TechnoBoom's `55"` / `24''` never parse — and
//    without a screen size a television has no parent key at all
//    (variantMatching.buildParentKey). So we emit an explicit `NN inch` token.
function buildSpecDescription(item: TechnoboomItem, specs: Record<string, string>) {
  const parts: string[] = [];
  const full = stripHtml(String(item.fullDescription ?? ""));
  if (full) parts.push(sanitizeSpecText(full));

  const inches = screenInches(item, specs);
  if (inches) parts.push(`${inches} inch`);

  for (const [label, value] of Object.entries(specs)) {
    parts.push(`${label}: ${sanitizeSpecText(value)}`);
  }

  const warranty = String(item.itemTrackingName ?? "").trim();
  if (warranty) parts.push(`გარანტია: ${sanitizeSpecText(warranty)}`);

  // Parts are separated with " | " rather than ". ": a full stop glues onto the
  // preceding token ("60HZ" -> "60HZ.") which both defeats the refresh-rate
  // filter in `modelCodes()` and breaks the screen-size regex's `(?=\s|$)`
  // lookahead after "inch". A pipe is one of the separators both splitters
  // already treat as whitespace.
  const text = parts.join(" | ").trim();
  return text.length ? text : undefined;
}

// TechnoBoom's TV and monitor model codes lead with the diagonal
// ("32BS8000", "55HY9909WOS"), which is the only screen size available on a
// `prices` pass that skips the spec call.
function screenInches(item: TechnoboomItem, specs: Record<string, string>): string | undefined {
  for (const label of DIAGONAL_LABELS) {
    const raw = specs[label];
    const match = raw?.match(/(\d{1,3}(?:\.\d)?)/)?.[1];
    if (match && isPlausibleInches(match)) return match;
  }
  if (item.categoryId !== 25 && item.categoryId !== 17) return undefined;
  const fromModel = String(item.description ?? "").match(/^(\d{2,3})(?=[A-Za-z])/)?.[1];
  return fromModel && isPlausibleInches(fromModel) ? fromModel : undefined;
}

function isPlausibleInches(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 17 && parsed <= 120;
}

// fullDescription is rich text from the store's admin, so it arrives as raw
// HTML. Left alone, the markup itself becomes matcher input: the tag soup in
// "</span></li>" survives tokenisation as "span" and "lili" and gets picked as
// the product's model code (e.g. "hyundai|80_200oc_span_ppspan").
function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeSpecText(value: string) {
  return value
    .split(/\s+/)
    .map((token) => (looksLikeModelCode(token) ? token.replace(/(\d)(?=[A-Za-z])|([A-Za-z])(?=\d)/g, "$1$2 ") : token))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeModelCode(token: string) {
  const cleaned = token.replace(/[^A-Za-z0-9_./-]/g, "");
  // One shorter than `modelCodes()`'s 5-character floor, so a value that only
  // reaches it once punctuation is appended is defused too.
  return cleaned.length >= 4 && /[A-Za-z]/.test(cleaned) && /\d/.test(cleaned);
}

function imageList(item: TechnoboomItem): string[] {
  const raw = [...(item.itemImageUrls ?? []), item.imageUrl].filter((value): value is string => Boolean(value));
  const seen = new Set<string>();
  const images: string[] = [];
  for (const value of raw) {
    const absolute = absoluteImageUrl(value);
    if (!absolute || seen.has(absolute)) continue;
    seen.add(absolute);
    images.push(absolute);
  }
  return images;
}

function absoluteImageUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/assets/placeholder.svg") return undefined;
  if (trimmed.startsWith("http")) return trimmed;
  if (trimmed.startsWith("/uploads/")) return `${IMAGE_BASE}${trimmed}`;
  return `${IMAGE_BASE}/uploads/${trimmed.replace(/^\/+/, "")}`;
}

// ── Validation ───────────────────────────────────────────────────────────────

async function validateSnapshot(snapshot: TechnoboomSnapshot): Promise<ValidationReport> {
  const urls = new Set<string>();
  const keys = new Set<string>();
  let duplicateUniqueKeyCount = 0;
  let missingTitleCount = 0;
  let missingPriceCount = 0;
  let missingImageCount = 0;
  let missingBrandCount = 0;
  let invalidUrlCount = 0;
  let uncategorizedCount = 0;
  let publicCategoryCount = 0;

  for (const product of snapshot.products) {
    urls.add(product.productUrl);
    if (keys.has(product.uniqueKey)) duplicateUniqueKeyCount += 1;
    keys.add(product.uniqueKey);
    if (!product.title) missingTitleCount += 1;
    if (product.currentPriceGel == null) missingPriceCount += 1;
    if (!product.imageUrl) missingImageCount += 1;
    if (!product.brand) missingBrandCount += 1;
    if (!isTechnoboomUrl(product.productUrl)) invalidUrlCount += 1;
    if (product.fasmetriCategorySlug === FALLBACK_CATEGORY) uncategorizedCount += 1;
    if (product.fasmetriCategorySlug === "televisions") publicCategoryCount += 1;
  }

  const oldActiveRawOfferCount = await activeRawOfferCount();
  const productCount = snapshot.products.length;
  const hardFailures: string[] = [];
  const warnings: string[] = [];

  if (productCount === 0) hardFailures.push("TechnoBoom listing returned zero items.");
  if (duplicateUniqueKeyCount) hardFailures.push(`${duplicateUniqueKeyCount} duplicate unique keys detected.`);
  if (invalidUrlCount) hardFailures.push(`${invalidUrlCount} product URLs are not on technoboom.ge.`);
  if (missingPriceCount > Math.max(5, Math.ceil(productCount * MAX_MISSING_PRICE_RATIO))) {
    hardFailures.push(`${missingPriceCount} items are missing prices.`);
  }
  // A full snapshot is the whole catalogue, so a collapse means a broken read,
  // not a mass delisting — refuse to promote rather than deactivate the store.
  const isFullCatalogPass = snapshot.listing.itemsAfterFilter === snapshot.listing.itemsFromApi;
  if (isFullCatalogPass && oldActiveRawOfferCount > 0 && productCount < Math.floor(oldActiveRawOfferCount * LOW_COUNT_RATIO)) {
    hardFailures.push(
      `New item count ${productCount} is suspiciously lower than the ${oldActiveRawOfferCount} TechnoBoom offers already stored.`,
    );
  }

  if (missingImageCount) warnings.push(`${missingImageCount} items are missing images.`);
  if (missingBrandCount) warnings.push(`${missingBrandCount} items are missing a brand.`);
  if (uncategorizedCount) warnings.push(`${uncategorizedCount} items fell back to the "${FALLBACK_CATEGORY}" category.`);
  if (snapshot.listing.failedDetailIds.length) {
    warnings.push(`${snapshot.listing.failedDetailIds.length} detail fetches failed (specs fall back to the listing row).`);
  }

  return {
    itemsFromApi: snapshot.listing.itemsFromApi,
    totalUniqueProductUrls: productCount,
    duplicateUrlCount: snapshot.listing.duplicateUrlCount,
    duplicateUniqueKeyCount,
    missingTitleCount,
    missingPriceCount,
    missingImageCount,
    missingBrandCount,
    invalidUrlCount,
    uncategorizedCount,
    publicCategoryCount,
    oldActiveRawOfferCount,
    newScrapedCount: productCount,
    promotionStatus: "not_requested",
    hardFailures,
    warnings,
  };
}

// ── Promotion (raw-offer writes only) ────────────────────────────────────────

async function promoteSnapshot(snapshot: TechnoboomSnapshot, options: TechnoboomSyncOptions): Promise<PromotionReport> {
  if (!db) throw new Error("DATABASE_URL is required for promotion.");
  const shop = await db.shop.upsert({
    where: { slug: STORE },
    update: { name: STORE_NAME, baseUrl: STORE_BASE_URL, enabled: true, needsConfiguration: false },
    create: { slug: STORE, name: STORE_NAME, baseUrl: STORE_BASE_URL, enabled: true, needsConfiguration: false },
  });

  const batchId = createImportBatch(STORE, options.category);
  const existingUrls = new Set(await rawOfferUrls(shop.id));
  let rawOffersWritten = 0;
  let rawOffersCreated = 0;
  let rawOffersUpdated = 0;
  let skippedCount = 0;

  for (const item of snapshot.products) {
    if (item.currentPriceGel == null || !item.title) {
      skippedCount += 1;
      continue;
    }
    await saveRawOffer(shop.id, scrapedOffer(item), batchId);
    rawOffersWritten += 1;
    if (existingUrls.has(item.productUrl)) rawOffersUpdated += 1;
    else rawOffersCreated += 1;
  }

  const liveUrls = new Set(snapshot.products.map((item) => item.productUrl));
  // Delisting is only meaningful when this pass covered the whole catalogue;
  // a `--category` or `--limit` pass legitimately leaves offers untouched.
  const isFullCatalogPass =
    snapshot.listing.itemsAfterFilter === snapshot.listing.itemsFromApi &&
    snapshot.listing.uniqueProductUrls === snapshot.listing.itemsAfterFilter;
  const removal = isFullCatalogPass
    ? await markMissingOffers(shop.id, liveUrls)
    : { delistedRawOffers: 0, offersMarkedOutOfStock: 0, offersMarkedInactive: 0 };

  await db.shop.update({
    where: { id: shop.id },
    data: { lastScrapedAt: new Date(), lastIngestedAt: new Date(), ingestionStatus: "SUCCESS" },
  });

  return { rawOffersWritten, rawOffersCreated, rawOffersUpdated, skippedCount, ...removal };
}

function scrapedOffer(item: StagedTechnoboomItem): ScrapedOffer {
  return {
    externalId: item.externalId,
    title: item.title,
    url: item.productUrl,
    imageUrl: item.imageUrl,
    price: item.currentPriceGel ?? 0,
    oldPrice: item.oldPriceGel ?? undefined,
    availability: item.availability,
    categorySlug: item.fasmetriCategorySlug,
    description: item.specDescription,
    breadcrumbs: item.breadcrumbs,
    imageAlt: item.title,
    brand: item.brand,
    model: item.model,
  };
}

async function markMissingOffers(shopId: string, liveUrls: Set<string>) {
  if (!db) return { delistedRawOffers: 0, offersMarkedOutOfStock: 0, offersMarkedInactive: 0 };
  const stored = await db.rawOffer.findMany({
    where: { shopId, status: { notIn: ["EXCLUDED"] } },
    select: { id: true, originalUrl: true },
  });

  let delistedRawOffers = 0;
  let offersMarkedOutOfStock = 0;
  let offersMarkedInactive = 0;
  const now = new Date();

  for (const raw of stored) {
    if (liveUrls.has(raw.originalUrl)) continue;
    await db.rawOffer.update({
      where: { id: raw.id },
      data: {
        status: "EXCLUDED",
        errorMessage: "Not present in the latest TechnoBoom catalogue snapshot.",
        processedAt: now,
      },
    });
    delistedRawOffers += 1;

    const offers = await db.productOffer.findMany({
      where: { shopId, url: raw.originalUrl },
      select: { id: true, missedSyncCount: true, possiblyInactiveAt: true, isActive: true },
    });
    for (const offer of offers) {
      const missedSyncCount = offer.missedSyncCount + 1;
      const inactive = missedSyncCount >= INACTIVE_MISS_THRESHOLD;
      await db.productOffer.update({
        where: { id: offer.id },
        data: {
          availability: OfferAvailability.OUT_OF_STOCK,
          lastCheckedAt: now,
          missedSyncCount,
          possiblyInactiveAt: offer.possiblyInactiveAt ?? now,
          isActive: inactive ? false : offer.isActive,
          inactiveAt: inactive ? now : undefined,
        },
      });
      offersMarkedOutOfStock += 1;
      if (inactive) offersMarkedInactive += 1;
    }
  }

  return { delistedRawOffers, offersMarkedOutOfStock, offersMarkedInactive };
}

async function rawOfferUrls(shopId: string): Promise<string[]> {
  if (!db) return [];
  const rows = await db.rawOffer.findMany({ where: { shopId }, select: { originalUrl: true } });
  return rows.map((row) => row.originalUrl);
}

async function activeRawOfferCount(): Promise<number> {
  if (!db) return 0;
  return db.rawOffer.count({ where: { shop: { slug: STORE }, status: { notIn: ["EXCLUDED"] } } });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isTechnoboomUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.endsWith("technoboom.ge");
  } catch {
    return false;
  }
}

function userAgent() {
  return process.env.SCRAPER_USER_AGENT ?? USER_AGENT;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": userAgent(),
          accept: "application/json",
          "content-type": "application/json",
          origin: STORE_BASE_URL,
          referer: `${STORE_BASE_URL}/`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

function readSnapshot(rawFile?: string): TechnoboomSnapshot {
  const file = rawFile ? resolve(rawFile) : resolve(defaultRawDir(), `${STORE}-sync-latest.json`);
  if (!existsSync(file)) throw new Error(`Raw snapshot does not exist: ${file}`);
  return JSON.parse(readFileSync(file, "utf8")) as TechnoboomSnapshot;
}

function writeSnapshot(snapshot: TechnoboomSnapshot, rawDir?: string) {
  const dir = writableDir(rawDir ?? defaultRawDir());
  const file = join(dir, `${STORE}-sync-${timestampForFile(new Date())}.json`);
  const latest = join(dir, `${STORE}-sync-latest.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2));
  writeFileSync(latest, JSON.stringify({ ...snapshot, rawFile: file }, null, 2));
  return file;
}

function writeReport(report: TechnoboomSyncReport, reportDir?: string) {
  const dir = writableDir(reportDir ?? "reports");
  const timestamp = timestampForFile(new Date(report.finishedAt));
  // log-sync.ts looks for reports/{store}-{category}-sync-latest.json, and the
  // workflow logs this store under the single pseudo-category "catalog".
  const reportFile = join(dir, `${REPORT_KEY}-sync-${timestamp}.json`);
  const latestReportFile = join(dir, `${REPORT_KEY}-sync-latest.json`);
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  writeFileSync(latestReportFile, JSON.stringify({ ...report, reportFile, latestReportFile }, null, 2));
  return { reportFile, latestReportFile };
}

function defaultRawDir() {
  return join(".codex-logs", STORE, "raw");
}

function writableDir(preferred: string) {
  try {
    mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const fallback = join(tmpdir(), `fasmetri-${STORE}-sync`, preferred.replace(/[:\\/]+/g, "-"));
    mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function timestampForFile(date: Date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function withSyncLock<T>(callback: () => Promise<T>) {
  const lockPath = join(".codex-logs", `${STORE}-sync.lock`);
  acquireFileLock(lockPath);
  let dbLocked = false;
  try {
    if (db) {
      const rows = await db.$queryRawUnsafe<Array<{ locked: boolean }>>(`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS locked`);
      dbLocked = Boolean(rows[0]?.locked);
      if (!dbLocked) throw new Error("Another TechnoBoom sync is already running.");
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
      throw new Error("Another TechnoBoom sync lock is active.");
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

export const __technoboomInternals = { stageItem, buildTitle, fasmetriCategoryFor, productUrl };
export type { TechnoboomItem };
