// Alta (alta.ge) — API-only ingestion.
//
// alta.ge is a Next.js storefront backed by its own public JSON API at
// api.alta.ge, which the storefront itself calls and which publishes a Swagger
// document. Reading that API is dramatically cheaper than crawling ~8,150
// product pages, so Alta is ingested the same way TechnoBoom is rather than
// through the HTML scraper runner.
//
// Endpoints used (all GET, all public, all read-only):
//   /v1/Categories/all-categories  -> the 18 top categories + their children
//   /v1/Products/v4                -> paginated listing, the richest source
//
// Things that matter when changing this:
//
//   * Limit is pinned to 16. Anything larger returns 403 from Cloudflare, so
//     the catalogue costs ~510 calls. Do not "optimise" it upward.
//   * Accept-Language: ka-GE is REQUIRED. Without it the API answers in
//     English and returns English routes, which would produce product URLs
//     that do not match the Georgian storefront and titles inconsistent with
//     every other shop in the catalogue.
//   * /v1/Products/fb-commerce looks tempting — one call, the whole catalogue —
//     but it is a stale Facebook feed: 49,982 rows against ~8,150 live
//     products, `route` null on every single one and `availability` reporting
//     "out of stock" for all of them. It cannot be used.
//   * The listing rows carry previousPrice, so Alta is one of the few shops
//     where a real old price is available without a second request.

import { execFileSync } from "node:child_process";
import { OfferAvailability } from "@prisma/client";
import { type PublicCategorySlug, isPublicCategorySlug } from "@/config/categoryMapping";
import { categorizeProduct } from "@/lib/categorizeProduct";
import { prisma } from "@/lib/prisma";
import { saveRawOffer } from "@/server/scrapers/runner";
import type { ScrapedOffer } from "@/server/scrapers/types";
import { createImportBatch } from "@/lib/importPipeline";

const db = prisma;

const API_BASE = "https://api.alta.ge";
const SITE_BASE = "https://alta.ge";
const CATEGORIES_URL = `${API_BASE}/v1/Categories/all-categories`;
const LISTING_URL = `${API_BASE}/v1/Products/v4`;

// Cloudflare rejects the bot UA on api.alta.ge even though alta.ge itself
// serves it happily, so the API client presents a normal browser UA plus the
// Origin/Referer pair the storefront sends.
// The header NAMES must stay capitalised exactly as written. Cloudflare
// fingerprints header casing: sending `origin:`/`accept:` in lower case earns
// a "Just a moment" JS challenge on every request, while `Origin:`/`Accept:`
// returns JSON. Verified by alternating the two forms against the live API.
const API_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Origin: SITE_BASE,
  Referer: `${SITE_BASE}/`,
  Accept: "application/json",
  "Accept-Language": "ka-GE",
};

const PAGE_SIZE = 16; // hard limit — see header note
const REQUEST_DELAY_MS = 300;
const MAX_RETRIES = 3;
const MAX_PAGES_PER_CATEGORY = 400; // 6,400 products; guards against a bad hasNextPage

export type AltaSyncMode = "discover" | "full" | "prices";

export type AltaCategory = { id: number; name: string; url: string };

type AltaListingProduct = {
  id: number;
  name?: string | null;
  price?: number | null;
  previousPrice?: number | null;
  barCode?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  parentCategoryName?: string | null;
  storageQuantity?: number | null;
  disableBuyButton?: boolean | null;
};

type AltaListingResponse = {
  products?: AltaListingProduct[];
  productsCount?: number;
  hasNextPage?: boolean;
  success?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Alta is fetched with curl, not global fetch, and that is not a style choice.
// Cloudflare fingerprints the TLS/HTTP2 handshake in front of both alta.ge and
// api.alta.ge: with byte-identical headers, curl gets 200 and Node's undici
// gets 403 every time. This is what the old
// `blockReason: "blocked_by_cloudflare"` note was actually describing — the
// client, not the IP or the user agent. Do not "modernise" this back to fetch
// without re-testing against the live API; it will silently return zero
// products.
function curlJson<T>(url: string): T | null {
  const args = ["-s", "--compressed", "--max-time", "45"];
  for (const [key, value] of Object.entries(API_HEADERS)) {
    if (key === "User-Agent") args.push("-A", value);
    else args.push("-H", `${key}: ${value}`);
  }
  args.push(url);
  const stdout = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
  return JSON.parse(stdout) as T;
}

async function apiGet<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return curlJson<T>(url);
    } catch (error) {
      console.warn(`[alta] GET ${url} failed: ${(error as Error).message.slice(0, 160)} (attempt ${attempt + 1})`);
    }
    if (attempt < MAX_RETRIES) await sleep(750 * 2 ** attempt);
  }
  return null;
}

/**
 * Alta's category tree is 18 roots over ~292 nodes, but a listing request for a
 * parent already returns every descendant (CategoryId=6 yields 779 rows, and
 * that category's sitemap lists 788 products). Walking all 292 nodes would
 * therefore re-fetch the same products once per level for no extra coverage.
 * Roots only is the default; `deep` exists for diagnosing a single branch.
 */
export async function fetchCategories(deep = false): Promise<AltaCategory[]> {
  const payload = await apiGet<unknown>(CATEGORIES_URL);
  const roots = Array.isArray(payload)
    ? payload
    : ((payload as { categories?: unknown })?.categories as unknown[] | undefined) ?? [];

  const out: AltaCategory[] = [];
  const seen = new Set<number>();
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object") return;
    const n = node as { id?: number; name?: string; url?: string; childCategories?: unknown[] };
    if (typeof n.id === "number" && !seen.has(n.id)) {
      seen.add(n.id);
      out.push({ id: n.id, name: n.name ?? String(n.id), url: n.url ?? "" });
    }
    if (!deep && depth === 0) return;
    for (const child of n.childCategories ?? []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return out;
}

/** Walks every page of one category. Returns the raw listing rows. */
async function fetchCategoryProducts(category: AltaCategory): Promise<AltaListingProduct[]> {
  const collected: AltaListingProduct[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page += 1) {
    const url = `${LISTING_URL}?CategoryId=${category.id}&Limit=${PAGE_SIZE}&Page=${page}`;
    const body = await apiGet<AltaListingResponse>(url);
    if (!body) {
      console.warn(`[alta] listing failed: category=${category.id} (${category.name}) page=${page}`);
      break;
    }
    const products = body.products ?? [];
    collected.push(...products);
    if (!body.hasNextPage || products.length === 0) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return collected;
}

function availabilityOf(item: AltaListingProduct): OfferAvailability {
  // storageQuantity is the store's own stock figure and is the only stock
  // signal in the listing payload. disableBuyButton is a separate merchandising
  // flag (pre-order, call-to-order) and is treated as not purchasable.
  if (item.disableBuyButton) return "OUT_OF_STOCK" as OfferAvailability;
  if (typeof item.storageQuantity !== "number") return "UNKNOWN" as OfferAvailability;
  return (item.storageQuantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK") as OfferAvailability;
}

// Alta titles are bare "Brand ModelCode" strings. "Samsung RB29FERNDSA/WR"
// contains no word any category rule can match, so every white good scored 28
// and fell into `other` — out of the public catalogue entirely. The category
// name the API returns beside each product is the only category signal there
// is, and passing it as a breadcrumb is NOT enough: categorizeProduct caps a
// context-only match at 64, under the 72 needed to leave review. The field
// that carries first-party weight is `scrapedShopCategory`, and it has to hold
// a Fasmetri slug, not a Georgian label.
//
// Resolving the label through the same classifier the rest of the pipeline
// uses — rather than a hand-written id table — is deliberate: it keeps Alta's
// "თმის ფენი" in whatever bucket every other shop's hair dryer lands in, and
// cross-store matching depends on that agreeing.
const CATEGORY_NAME_OVERRIDES: Record<string, PublicCategorySlug> = {
  // "მოვლა"/care reads as personal care to the classifier; it is an appliance.
  "ჰაერის გამწმენდი & დამატენიანებელი": "home-appliances",
  "სმარტ საათები": "wearables",
  "პორტატული დინამიკი": "audio",
};

// Groups that are not comparable goods, or accessories that would otherwise be
// filed beside the device they attach to — a tempered-glass sheet sitting
// inside `mobiles` is noise, not a phone. Unmapped means the classifier falls
// back to the title, which for these lands in a non-public bucket.
// Matched against the LEAF name only. Two of Alta's roots are named
// "<thing> და აქსესუარები", so testing the parent as well silently excluded
// მობილური ტელეფონები and ნოუთბუქი — the two biggest categories in the shop.
const EXCLUDED_CATEGORY_PATTERNS = [/აქსესუარ/, /სერვის/, /თამაშები/, /ვაუჩერ/];
// Outlet is the one case that does inherit: every child of ალტას აუთლეტი is
// ex-display stock regardless of what the child is called.
const OUTLET_PATTERN = /აუთლეტ/;
const EXCLUDED_CATEGORY_NAMES = new Set([
  "Micro SD ბარათი",
  "სელფის ჯოხი",
  "მობილურის სადგამი",
  "სმარტ სათვალე",
  "სმარტფონის სათამაშო კონტროლერი",
  "საბავშვო მიკროფონი",
  "ეკრანის დამცავი",
  "დამცავი ქეისი",
]);

const categorySlugCache = new Map<string, PublicCategorySlug | undefined>();

function fasmetriCategoryFor(item: AltaListingProduct): PublicCategorySlug | undefined {
  const name = item.categoryName?.trim();
  if (!name) return undefined;
  const key = `${item.parentCategoryName ?? ""}\u0000${name}`;
  if (categorySlugCache.has(key)) return categorySlugCache.get(key);
  const resolved = resolveCategoryName(name, item.parentCategoryName ?? undefined);
  categorySlugCache.set(key, resolved);
  return resolved;
}

function resolveCategoryName(name: string, parent?: string): PublicCategorySlug | undefined {
  if (EXCLUDED_CATEGORY_NAMES.has(name)) return undefined;
  if (EXCLUDED_CATEGORY_PATTERNS.some((pattern) => pattern.test(name))) return undefined;
  // Alta Outlet is ex-display and returned stock priced below new. alta.adapter.ts
  // already holds it out of the public categories; this keeps the sync agreeing.
  if (OUTLET_PATTERN.test(name) || (parent ? OUTLET_PATTERN.test(parent) : false)) return undefined;
  const override = CATEGORY_NAME_OVERRIDES[name];
  if (override) return override;
  const decision = categorizeProduct({ title: name });
  return isPublicCategorySlug(decision.publicCategorySlug) ? decision.publicCategorySlug : undefined;
}

function toScrapedOffer(item: AltaListingProduct): ScrapedOffer | null {
  const title = item.name?.trim();
  const price = typeof item.price === "number" ? item.price : undefined;
  if (!title || !price || price <= 0 || !item.route) return null;

  // previousPrice is only an old price when it is genuinely higher; Alta
  // sometimes echoes the current price back into it.
  const oldPrice =
    typeof item.previousPrice === "number" && item.previousPrice > price ? item.previousPrice : undefined;

  const breadcrumbs = [item.parentCategoryName, item.categoryName].filter(Boolean) as string[];

  return {
    externalId: item.barCode?.trim() || String(item.id),
    title,
    url: `${SITE_BASE}/${item.route.replace(/^\/+/, "")}`,
    imageUrl: item.imageUrl ?? undefined,
    price,
    oldPrice,
    availability: availabilityOf(item),
    // Lands in RawOffer.rawCategory, which normalize-raw-offers reads as
    // `scrapedShopCategory` — the one input that clears the review threshold
    // on its own. The breadcrumbs stay as a secondary signal for the rules
    // that read description/context.
    categorySlug: fasmetriCategoryFor(item),
    breadcrumbs,
    imageAlt: title,
    brand: item.brandName ?? undefined,
  };
}

export type AltaSyncResult = {
  mode: AltaSyncMode;
  categories: number;
  itemsFromApi: number;
  uniqueProducts: number;
  usable: number;
  written: number;
  skipped: number;
  batchId?: string;
};

export async function runAltaSync(options: {
  mode: AltaSyncMode;
  promote?: boolean;
  limit?: number;
  categoryId?: number;
}): Promise<AltaSyncResult> {
  const categoriesAll = await fetchCategories();
  const categories = options.categoryId
    ? categoriesAll.filter((c) => c.id === options.categoryId)
    : categoriesAll;

  const byId = new Map<number, AltaListingProduct>();
  let itemsFromApi = 0;

  for (const category of categories) {
    const products = await fetchCategoryProducts(category);
    itemsFromApi += products.length;
    // A product listed under several categories comes back more than once;
    // the first occurrence wins so the category that lists it first is kept.
    for (const product of products) if (!byId.has(product.id)) byId.set(product.id, product);
    console.log(`[alta] ${category.name} (id=${category.id}): ${products.length} rows, ${byId.size} unique so far`);
    if (options.limit && byId.size >= options.limit) break;
    await sleep(REQUEST_DELAY_MS);
  }

  let unique = [...byId.values()];
  if (options.limit) unique = unique.slice(0, options.limit);

  const offers = unique.map(toScrapedOffer).filter(Boolean) as ScrapedOffer[];

  const result: AltaSyncResult = {
    mode: options.mode,
    categories: categories.length,
    itemsFromApi,
    uniqueProducts: unique.length,
    usable: offers.length,
    written: 0,
    skipped: unique.length - offers.length,
  };

  if (options.mode === "discover" || !options.promote) return result;

  if (!db) throw new Error("DATABASE_URL is required to promote Alta offers.");
  const shop = await db.shop.upsert({
    where: { slug: "alta" },
    update: { name: "Alta", baseUrl: SITE_BASE, needsConfiguration: false },
    create: { slug: "alta", name: "Alta", baseUrl: SITE_BASE, enabled: true, needsConfiguration: false },
  });

  const batchId = createImportBatch("alta");
  for (const offer of offers) {
    await saveRawOffer(shop.id, offer, batchId);
    result.written += 1;
  }

  await db.shop.update({
    where: { id: shop.id },
    data: { lastScrapedAt: new Date(), lastIngestedAt: new Date(), ingestionStatus: "SUCCESS" },
  });

  result.batchId = batchId;
  return result;
}
