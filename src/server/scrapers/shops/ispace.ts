import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FasmetriCategorySlug } from "@/config/categoryMapping";
import { categorySlugForSignals } from "@/server/scrapers/categories";
import { JsonLdNode, jsonLdNodes, nodeHasType, objectValue, objectValues, stringValue } from "@/server/scrapers/json-ld";
import { extractLocs } from "@/server/scrapers/sitemap";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)";
const BASE_URL = "https://ispace.ge";

// Verified 2026-09-22. iSpace is Apple's official Premium Reseller storefront
// in Georgia (Nuxt SSR behind Cloudflare) — unlike Alta, plain Node `fetch`
// gets a 200 here, so no curl/capitalised-header workaround is needed. The
// site publishes a single flat sitemap.xml (no index, ~3,600 <loc> entries):
// /product/... (~1,149), /category/... (~183), /blog/... (~850), plus a
// duplicate /en/... copy of most of those. Only the Georgian-locale product
// URLs are ingested; /en/ is filtered out to avoid double-counting the same
// SKU under two locales.
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;

const PRODUCT_PATH = /^\/product\/[a-z0-9-]+$/i;

// robots.txt disallows /search, /cart, /checkout, /compare, /tproduct, and
// any path with a query string. None of those ever appear in the sitemap's
// /product/ or /category/ entries, but the guard is explicit here so a future
// change to the sitemap can't silently start feeding disallowed URLs in.
const DISALLOWED_PATH = /^\/(search|cart|checkout|compare|tproduct)\b/i;

const URL_CACHE_PATH = join(".codex-logs", "cache", "ispace-product-urls.json");
const URL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function readUrlCache(): string[] | null {
  try {
    if (!existsSync(URL_CACHE_PATH)) return null;
    const raw = JSON.parse(readFileSync(URL_CACHE_PATH, "utf8")) as { savedAt?: string; urls?: string[] };
    if (!raw.savedAt || !Array.isArray(raw.urls) || raw.urls.length === 0) return null;
    if (Date.now() - new Date(raw.savedAt).getTime() > URL_CACHE_TTL_MS) return null;
    return raw.urls;
  } catch {
    return null; // a corrupt cache must never break the crawl
  }
}

function writeUrlCache(urls: string[]) {
  try {
    mkdirSync(dirname(URL_CACHE_PATH), { recursive: true });
    writeFileSync(URL_CACHE_PATH, JSON.stringify({ savedAt: new Date().toISOString(), urls }));
  } catch (error) {
    console.warn(`[ispace] could not write URL cache: ${(error as Error).message}`);
  }
}

async function listProductUrls() {
  const cached = readUrlCache();
  if (cached) return cached;

  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  let locs: string[] = [];
  try {
    const response = await fetch(SITEMAP_URL, { headers: { "user-agent": userAgent }, cache: "no-store" });
    if (!response.ok) {
      console.warn(`[ispace] sitemap fetch failed: HTTP ${response.status}`);
      return [];
    }
    locs = extractLocs(await response.text());
  } catch (error) {
    console.warn(`[ispace] sitemap fetch threw: ${(error as Error).message}`);
    return [];
  }

  const filtered = locs.filter((raw) => {
    try {
      const url = new URL(raw);
      if (!/(^|\.)ispace\.ge$/i.test(url.hostname)) return false;
      const path = url.pathname.replace(/\/+$/, "");
      if (DISALLOWED_PATH.test(path) || url.search) return false;
      // Drop the /en/ locale mirror — same SKU, same sitemap, we only need it once.
      if (/^\/en\//i.test(path)) return false;
      return PRODUCT_PATH.test(path);
    } catch {
      return false;
    }
  });

  // Cache the FILTERED list so paged --offset windows walk an identical,
  // identically-ordered list across separate process invocations.
  writeUrlCache(filtered);
  return filtered;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

type BreadcrumbEntry = { name: string; pathSlug: string | null };

// Deepest-first: index 0 is the product page itself. category-path resolution
// walks past that and looks at the levels above it.
function breadcrumbEntries(nodes: JsonLdNode[]): BreadcrumbEntry[] {
  const breadcrumb = nodes.find((node) => nodeHasType(node, "BreadcrumbList"));
  return objectValues(breadcrumb?.itemListElement)
    .sort((left, right) => (Number(right.position) || 0) - (Number(left.position) || 0))
    .map((entry) => {
      const name = stringValue(entry.name)?.trim();
      const itemUrl = stringValue(entry.item);
      const pathSlug = itemUrl ? new URL(itemUrl, BASE_URL).pathname.match(/^\/category\/([a-z0-9-]+)/i)?.[1] ?? null : null;
      return name ? { name, pathSlug } : null;
    })
    .filter((entry): entry is BreadcrumbEntry => Boolean(entry));
}

function productImage(value: unknown) {
  return Array.isArray(value) ? stringValue(value[0]) : stringValue(value);
}

function availability(value: unknown): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const signal = stringValue(value)?.toLocaleLowerCase();
  if (!signal) return "UNKNOWN";
  if (signal.includes("outofstock")) return "OUT_OF_STOCK";
  if (signal.includes("instock")) return "IN_STOCK";
  return "UNKNOWN";
}

// ── Category taxonomy (read off the live sitemap's 183 /category/ URLs,
// 2026-09-22) ────────────────────────────────────────────────────────────
// iSpace's own breadcrumb slugs are a far more precise category signal than
// generic keyword matching — see the Studio Display incident: its title says
// "VESA mount adapter" for the stand mount, which the generic cables-adapters
// keyword rule scored at 95% and misfiled a $13k monitor as a cable. Where a
// breadcrumb slug is listed below, it is used as ground truth and the
// keyword engine (categorySlugForSignals) is bypassed entirely for that
// product. Any breadcrumb slug NOT in this table — future iSpace categories,
// marketing collections like "summer-sale"/"bts"/"apple-promo" that carry no
// real taxonomy meaning — falls through to categorySlugForSignals(title,
// breadcrumb names), which always resolves to a slug (never undefined; see
// the standing rule in categoryMapping.ts). Nothing is ever dropped for lack
// of a mapping here.
const EXCLUDE = "EXCLUDE" as const;
type IspacePathDecision = FasmetriCategorySlug | typeof EXCLUDE;

const ISPACE_CATEGORY_PATH_MAP: Record<string, IspacePathDecision> = {
  // ── iPhone ──────────────────────────────────────────────────────────
  iphone: "mobiles", "iphone-15": "mobiles", "iphone-15-pro": "mobiles", "iphone-16": "mobiles",
  "iphone-16-pro": "mobiles", "iphone-16-pro-max": "mobiles", "iphone-17": "mobiles",
  "iphone-17-air": "mobiles", "iphone-17-pro": "mobiles", "iphone-17-pro-max": "mobiles",
  "iphone-17e": "mobiles", "iphone-18-pro": "mobiles", "iphone-18-pro-max": "mobiles",
  "iphone-duo": "mobiles", "iphone-series-15": "mobiles", "iphone-series-15-pro": "mobiles",
  "iphone-series-16": "mobiles", "iphone-series-16-pro": "mobiles", "iphone-series-17-pro": "mobiles",
  "iphone-series-18-pro": "mobiles",
  "accessories-for-iphone": "phone-accessories", "accessories-for-iphone-bo": "phone-accessories",
  "iphone-cables-and-adapters": "phone-accessories", "iphone-car-cradle": "phone-accessories",
  "iphone-cases": "phone-accessories", "iphone-power-adapters": "phone-accessories",
  "iphone-power-banks": "phone-accessories", "iphone-screen-protectors": "phone-accessories",
  "iphone-various-accessories": "phone-accessories", "wireless-charger-for-iphone": "phone-accessories",

  // ── iPad ────────────────────────────────────────────────────────────
  ipad: "tablets", "apple-ipad": "tablets", "ipad-2018": "tablets", "ipad-a16": "tablets",
  "ipad-a17-pro": "tablets", "ipad-air": "tablets", "ipad-air-11": "tablets", "ipad-air-11-m4": "tablets",
  "ipad-air-13": "tablets", "ipad-air-13-m4": "tablets", "ipad-air-m4": "tablets", "ipad-mini": "tablets",
  "ipad-pro": "tablets", "ipad-pro-11": "tablets", "ipad-pro-11-m5": "tablets", "ipad-pro-13": "tablets",
  "ipad-pro-13-m5": "tablets", "ipad-pro-m5": "tablets",
  "accessories-for-ipad": "tablet-accessories", "ipad-adapters": "tablet-accessories",
  "ipad-cables-and-adapters": "tablet-accessories", "ipad-cases": "tablet-accessories",
  "ipad-keyboards-and-input-devices": "tablet-accessories", "ipad-power-adapters": "tablet-accessories",
  "ipad-power-banks": "tablet-accessories", "ipad-screen-protectors": "tablet-accessories",
  "ipad-various-accessories": "tablet-accessories", "logitech-for-ipad": "tablet-accessories",
  "apple-pencil": "tablet-accessories",

  // ── Mac ─────────────────────────────────────────────────────────────
  "macbook-air": "laptops", "macbook-air-13": "laptops", "macbook-air-15": "laptops",
  "macbook-air-m4": "laptops", "macbook-air-m5": "laptops", "macbook-neo": "laptops",
  "macbook-pro": "laptops", "macbook-pro-14": "laptops", "macbook-pro-16": "laptops",
  "macbook-pro-m5": "laptops", "macbook-pro-m5-max": "laptops", "macbook-pro-m5-pro": "laptops",
  mac: "computers", imac: "computers", "mac-mini": "computers", "mac-studio": "computers",
  "accessories-for-mac": "computer-accessories", "logitech-for-mac": "computer-accessories",
  "logitech-keyboards": "computer-accessories", "logitech-mice": "computer-accessories",
  logitech: "computer-accessories", "mac-cables": "computer-accessories",
  "mac-cables-and-adapters": "computer-accessories", "mac-cases": "computer-accessories",
  "mac-keyboards": "computer-accessories", "mac-mice": "computer-accessories",
  "mac-power-adapters": "computer-accessories", "mac-various-accessories": "computer-accessories",
  "mouse-pads": "computer-accessories", "mouse-satechi": "computer-accessories",
  "external-memory": "computers",

  // ── Displays ────────────────────────────────────────────────────────
  "studio-display": "monitors", "apple-studio-display": "monitors", "studio-display-xdr": "monitors",
  "pro-display-xdr": "monitors",

  // ── Watch ───────────────────────────────────────────────────────────
  "apple-watch": "wearables", "apple-watch-se": "wearables", "apple-watch-se-3": "wearables",
  "apple-watch-series-10": "wearables", "apple-watch-series-11": "wearables",
  "apple-watch-series-12": "wearables", "apple-watch-ultra": "wearables",
  "apple-watch-ultra-2": "wearables", "apple-watch-ultra-3": "wearables",
  "apple-watch-ultra-4": "wearables", "fitness-devices": "wearables",
  // No dedicated wearable-accessories slug exists — the "wearables" CATEGORY_RULES
  // entry already carries watch-strap/watch-film keywords for exactly this reason.
  "watch-straps": "wearables", "watch-cables-and-adapters": "wearables",
  "services-for-apple-watch": EXCLUDE, "accessories-for-apple-watch": "wearables",

  // ── AirPods / audio ─────────────────────────────────────────────────
  airpods: "audio", "airpods-4": "audio", "airpods-5": "audio", "airpods-accessories": "audio",
  "airpods-max": "audio", "airpods-max-2": "audio", "airpods-pro-2": "audio", "airpods-pro-3": "audio",
  "apple-airpods-p48461": "audio", "services-for-airpods": EXCLUDE,
  headsets: "audio", "common-headsets": "audio", "bo-headsets": "audio", "logitech-headsets": "audio",
  acoustics: "audio", "acoustics-accessories": "audio", speakers: "audio", "home-audiosystems": "audio",
  "bo-home-audio-systems": "audio", "bo-portable-speakers": "audio", "bang-and-olufsen": "audio",
  klipsch: "audio", devialet: "audio",
  "bo-power-banks": "phone-accessories",

  // ── TV ──────────────────────────────────────────────────────────────
  "apple-tv-4k": "televisions", "apple-tv-accessories": "televisions", tv: "televisions",

  // ── Trackers / smart devices ────────────────────────────────────────
  airtag: "tech", "airtag-34567": "tech", "airtag-accessories": "tech", "airtag-accssesories": "tech",
  "subcat-airtag": "tech",
  aqara: "smart-home", "smart-home": "smart-home",
  // NOT mapped: "smart-devices". It is a mixed bucket, not a product type --
  // iSpace files Aqara hubs/sensors AND Canyon SW-series smartwatches under
  // it, and a blanket smart-home mapping put a wrist watch on the smart-home
  // shelf. Per-product title matching splits them correctly (the Aqara rule
  // keys on the brand name, the wearables rule on "canyon sw").
  "various-home-appliances": "smart-home",
  // NOT mapped here on purpose: "dji" is a brand hub, not a product type — DJI
  // sells actual drones (Mavic/Air/Mini/Avata) AND handheld gimbals/mics
  // (Osmo Mobile) that are not drones at all. Letting each product fall
  // through to title-based classification is what correctly splits them
  // between the "drones" and "photo-video" CATEGORY_RULES entries.

  // ── Generic accessories / charging (device-agnostic brand hubs are left
  // unmapped on purpose — see the note above the table; per-product title
  // matching does a better job of splitting a Belkin iPhone case from a
  // Belkin Mac dock than one blanket bucket would) ─────────────────────
  cables: "cables-adapters", "adapters-usb-hubs": "cables-adapters", "adapter-satechi": "cables-adapters",
  "connectivity-expansion": "cables-adapters", "power-and-charging": "cables-adapters",
  chargers: "phone-accessories", "power-banks": "phone-accessories", "wireless-chargers": "phone-accessories",
  "gaming-accessories": "gaming",

  // ── Not goods: services, vouchers, subscriptions ────────────────────
  services: EXCLUDE, "mac-services": EXCLUDE, "mac-software": EXCLUDE,
  "gift-cards": EXCLUDE, "gift-cards-p48510": EXCLUDE, subscriptions: EXCLUDE,
  "services-for-ipad": EXCLUDE, "services-for-iphone": EXCLUDE,

  // ── Condition: used / open-box stock. iSpace's JSON-LD itemCondition is
  // unreliable here — it reports NewCondition even on confirmed "-OD"
  // (open-box/2nd-life) SKUs (verified against live pages 2026-09-22), so the
  // breadcrumb category is the backstop; the real gate is the SKU/URL "-od"
  // suffix check in parseProductPage below. Never price-compare these
  // against new units.
  "2nd-life-iphone": EXCLUDE, "open-box": EXCLUDE,
};

// Marketing collections, not real categories — explicitly NOT entered above so
// a product under one of these still falls through to title-based
// classification instead of being force-mapped to something wrong:
// apple-promo, belkin-promo, satechi-promo, promo-satechi, summer-sale,
// extra-deals, bts, cto. Same for generic accessory-brand hubs (belkin,
// satechi, satechi-promo, canyon, native-union, pitaka) — they sell cases,
// cables AND chargers for multiple device types, so per-product title
// matching classifies them correctly where one shared bucket could not.

function resolveCategoryPath(entries: BreadcrumbEntry[]): IspacePathDecision | null {
  // entries[0] is the product page itself; walk the levels above it,
  // deepest first, so the most specific breadcrumb slug wins.
  for (let i = 1; i < entries.length; i++) {
    const slug = entries[i].pathSlug;
    if (slug && slug in ISPACE_CATEGORY_PATH_MAP) return ISPACE_CATEGORY_PATH_MAP[slug];
  }
  return null;
}

// Open-box / "2nd-life" stock reuses the same MPN with an "-OD" suffix on
// both the SKU and the URL slug (e.g. "MG8G4ZD/A-OD" at
// /product/iphone-17-pro-256-gb-silver-mg8g4zd-a-od) and is priced the same
// as new. itemCondition in the JSON-LD does NOT flag this (see the note
// above) so it cannot be trusted alone.
function isOpenBoxStock(url: URL, sku: string | undefined, itemCondition: string | undefined) {
  if (/-od$/i.test(url.pathname.replace(/\/+$/, ""))) return true;
  if (sku && /-od$/i.test(sku)) return true;
  if (itemCondition && !/newcondition/i.test(itemCondition)) return true;
  return false;
}

function parseProductPage(context: ProductPageParseContext) {
  const url = context.url.toString();
  const nodes = jsonLdNodes(context.$);
  // Product identifies by @type, never by array position: the page also
  // carries Organization and WebSite JSON-LD blocks ahead of it.
  const product = nodes.find((node) => nodeHasType(node, "Product"));
  if (!product) return null; // not a product page (shouldn't happen post sitemap-filter, but cheap to guard)

  const title = stringValue(product.name)?.trim();
  if (!title) {
    console.warn(`[ispace] Product JSON-LD without name: ${url}`);
    return null;
  }

  const offerNode = objectValue(product.offers) ?? objectValues(product.offers)[0];
  if (!offerNode) {
    console.warn(`[ispace] Product JSON-LD without offers: ${url}`);
    return null;
  }

  const currency = stringValue(offerNode.priceCurrency)?.toUpperCase();
  if (currency && currency !== "GEL") {
    console.warn(`[ispace] non-GEL priceCurrency ${currency}, skipping: ${url}`);
    return null;
  }

  const price = toNumber(offerNode.price);
  if (!price || price <= 0) {
    console.warn(`[ispace] missing or zero offers.price: ${url}`);
    return null;
  }

  const sku = stringValue(product.sku)?.trim();
  const itemCondition = stringValue(offerNode.itemCondition);
  if (isOpenBoxStock(context.url, sku, itemCondition)) {
    console.warn(`[ispace] open-box/2nd-life stock excluded (would fake-compare against new units): ${url}`);
    return null;
  }

  // Software licences and subscriptions are not physical goods and can never
  // be price-compared against hardware. The `subscriptions` breadcrumb EXCLUDE
  // above misses these two because iSpace files Microsoft Office 365 under
  // "Mac aqsesuarebi" (Mac accessories), not under a software category.
  if (/(office\s*365|microsoft\s*365|subscription)/i.test(title)) {
    console.warn(`[ispace] software subscription, not a physical product: ${url}`);
    return null;
  }

  const entries = breadcrumbEntries(nodes);
  const pathDecision = resolveCategoryPath(entries);
  if (pathDecision === EXCLUDE) {
    console.warn(`[ispace] service/voucher/subscription, not a physical product: ${url}`);
    return null;
  }

  // Stored/displayed in natural Home → Product order; entries itself stays
  // deepest-first above because resolveCategoryPath needs the most specific
  // breadcrumb level checked first.
  const breadcrumbNames = entries.map((entry) => entry.name).reverse();
  const categorySlug = pathDecision ?? categorySlugForSignals([...breadcrumbNames, title, context.url.pathname]);

  // The Apple MPN ("MG8G4AF/A") is a far stronger cross-store identity key
  // than a normalised title — it uniquely names a brand+model+storage+colour
  // combination. There is no dedicated MPN/manufacturer-SKU column on
  // RawOffer/ScrapedOffer, so it rides the existing `model` field: every
  // adapter's title/brand/model/description feed into
  // extractProductAttributes()'s extractionSignal in productNormalization.ts,
  // which skuCodes() pulls apart-number tokens like this one out of — and
  // safeProductMatcher.ts already gives an exact `modelCode`/`sku` match
  // spec-cap-lifting priority (see its skuExact branch). Also set as
  // externalId so the same SKU dedupes correctly within this shop. Brand is
  // read from the JSON-LD, never hard-coded: iSpace also carries DJI,
  // Logitech, Belkin, Satechi, Aqara, Bang & Olufsen, Klipsch, Devialet,
  // Canyon, Pitaka, and Native Union alongside Apple.
  return {
    externalId: sku ?? undefined,
    title,
    url,
    imageUrl: productImage(product.image),
    price,
    availability: availability(offerNode.availability),
    brand: stringValue(objectValue(product.brand)?.name),
    model: sku,
    breadcrumbs: breadcrumbNames,
    categorySlug,
  };
}

export const ispaceAdapter: ShopAdapter = {
  slug: "ispace",
  name: "iSpace",
  baseUrl: BASE_URL,
  enabledByDefault: true,
  needsConfiguration: false,
  rateLimitMs: 2000,
  maxProductsPerRun: 60,
  listProductUrls,
  parseProductPage,
};
