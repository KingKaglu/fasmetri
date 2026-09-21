import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { categorySlugForSignals } from "@/server/scrapers/categories";
import { JsonLdNode, jsonLdNodes, nodeHasType, objectValue, objectValues, stringValue } from "@/server/scrapers/json-ld";
import { extractLocs } from "@/server/scrapers/sitemap";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)";
const BASE_URL = "https://kontakt.ge";

// Verified against the live site on 2026-09-20. Kontakt runs Magento 2 with the
// Swissup Breeze theme and publishes its sitemaps under /media/, NOT at any of
// the conventional roots — /sitemap.xml and /sitemap_index.xml both 302 into a
// 404 page. The entry point below is an index listing three child sitemaps
// (~8,600 locs total). The paths come from robots.txt, which is the only place
// the store advertises them.
const SITEMAP_ENTRY_POINTS = [`${BASE_URL}/media/sitemap/sitemap_ge.xml`];

// Children are named sitemap_ge-2-1.xml, sitemap_ge-2-2.xml, …
const CHILD_SITEMAP_FILTER = /sitemap_ge-[\d-]+\.xml(?:[?#].*)?$/i;
const MAX_CHILD_SITEMAPS = 12;

// Product detail pages live at the site root as a single flat slug
// (/matsivari-beko-rcne366e40xbn-b300). Every multi-segment path in the sitemap
// is a category listing — all 335 of them were checked and none carries product
// JSON-LD. Restricting to single-segment paths drops the listings before we
// spend a fetch on them; the Offer gate in parseProductPage catches whatever
// slips through (brand hubs like /xiaomi are single-segment too).
const PRODUCT_PATH = /^\/[a-z0-9-]+$/i;

// Single-segment paths that are definitely not products: static content pages,
// plus the store's top-level category hubs. The hubs are listed at the very top
// of the sitemap, so without this a small --limit spends its whole budget
// fetching landing pages and reports zero products. Derived from every path
// prefix that has children in sitemap_ge.xml (2026-09-20).
const TOP_LEVEL_CATEGORIES = [
  "aveji-da-teqstili", "bavshvta-samyaro", "catalog", "gaming", "gatboba-da-gagrileba",
  "hobi-da-gartoba", "kompiuteruli-teknika", "konditsionerebi", "mobilurebi-da-aksesuarebi",
  "sakhli-da-dasuphtaveba", "sakhli-da-ezo", "samzareulos-teknika", "saqophatskhovrebo-teknika",
  "silamaze-da-janmrteloba", "smart-gajetebi", "tansacmeli-da-aqsesuarebi", "televizorebi",
];

const STATIC_PAGES = [
  "about-us", "blog", "career", "corporate", "delivery-service", "faq", "payment-methods",
  "privacy", "return-policy", "service-centres", "shops", "terms-conditions", "warranty-terms",
  "checkout", "cart", "customer", "catalogsearch", "compare", "wishlist", "search", "404",
  "free-delivery", "best-price-guarantee", "branch-order", "shida-ganvadeba",
];

// Static pages also appear with a locale suffix (/about-us-ge).
const NON_PRODUCT_PATH = new RegExp(
  `^/(?:${TOP_LEVEL_CATEGORIES.join("|")}|(?:${STATIC_PAGES.join("|")})(?:-[a-z]{2})?)$`,
  "i",
);

// Kontakt's sitemap index plus its three children is ~13MB, and the catalogue
// is walked in ~28 offset windows, each a separate process. Re-downloading and
// re-parsing all of it per window costs roughly a minute a time for a list
// that changes once a day, so the resolved URL list is cached on disk. The TTL
// is deliberately short enough that a same-day re-run still sees new products.
const URL_CACHE_PATH = join(".codex-logs", "cache", "kontakt-product-urls.json");
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
    console.warn(`[kontakt] could not write URL cache: ${(error as Error).message}`);
  }
}

async function fetchLocsSafe(url: string, userAgent: string): Promise<string[]> {
  try {
    const response = await fetch(url, { headers: { "user-agent": userAgent }, cache: "no-store" });
    if (!response.ok) {
      console.warn(`[kontakt] sitemap fetch failed: ${url} -> HTTP ${response.status}`);
      return [];
    }
    return extractLocs(await response.text());
  } catch (error) {
    console.warn(`[kontakt] sitemap fetch threw: ${url} -> ${(error as Error).message}`);
    return [];
  }
}

async function listProductUrls() {
  const cached = readUrlCache();
  if (cached) return cached;

  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const pageUrls = new Set<string>();

  for (const candidate of SITEMAP_ENTRY_POINTS) {
    const locs = await fetchLocsSafe(candidate, userAgent);
    if (!locs.length) continue;

    const childSitemaps = locs.filter((loc) => CHILD_SITEMAP_FILTER.test(loc)).slice(0, MAX_CHILD_SITEMAPS);
    const directPages = locs.filter((loc) => !/\.xml(?:[?#].*)?$/i.test(loc));
    for (const page of directPages) pageUrls.add(page);
    for (const child of childSitemaps) {
      for (const loc of await fetchLocsSafe(child, userAgent)) {
        if (!/\.xml(?:[?#].*)?$/i.test(loc)) pageUrls.add(loc);
      }
    }
    if (pageUrls.size) break; // first working sitemap entry point wins
  }

  if (!pageUrls.size) {
    console.warn(`[kontakt] no URLs discovered from ${SITEMAP_ENTRY_POINTS.join(", ")} — sitemap layout may have moved`);
    return [];
  }

  const filtered = [...pageUrls].filter((raw) => {
    try {
      const url = new URL(raw);
      if (!/(^|\.)kontakt\.ge$/i.test(url.hostname)) return false;
      const path = url.pathname.replace(/\/+$/, "");
      if (!path || !PRODUCT_PATH.test(path) || NON_PRODUCT_PATH.test(path)) return false;
      // The _ge sitemap is already locale-scoped; drop any stray /en//ru/ path.
      if (/^\/(en|ru)\//i.test(path)) return false;
      return true;
    } catch {
      return false;
    }
  });

  // Cache the FILTERED list: offset windows must page through an identical,
  // identically-ordered list, or a window would skip or repeat products.
  writeUrlCache(filtered);
  return filtered;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function breadcrumbNames(nodes: JsonLdNode[]) {
  const breadcrumb = nodes.find((node) => nodeHasType(node, "BreadcrumbList"));
  return objectValues(breadcrumb?.itemListElement)
    .map((entry) => stringValue(entry.name) ?? stringValue(objectValue(entry.item)?.name))
    .filter(Boolean) as string[];
}

function productImage(value: unknown) {
  return Array.isArray(value) ? stringValue(value[0]) : stringValue(value);
}

// Kontakt's availability is not dependable. The same URL returns
// "https://schema.org/OutOfStock" on one fetch and omits the field entirely on
// the next — Magento's full-page cache serves several variants of the page.
// Only an explicit signal is trusted, and a missing one is UNKNOWN rather than
// OUT_OF_STOCK: defaulting to out-of-stock would strike the whole store from
// price comparison the first time the cache served us the stripped variant.
function availability(value: unknown): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const signal = stringValue(value)?.toLocaleLowerCase();
  if (!signal) return "UNKNOWN";
  if (signal.includes("outofstock")) return "OUT_OF_STOCK";
  if (signal.includes("instock")) return "IN_STOCK";
  return "UNKNOWN";
}

// On product pages brand.name is the manufacturer ("Beko"). On brand hubs it is
// the full page title, which would poison productIdentity's brand extraction.
function brandName(product: JsonLdNode, title: string) {
  const brand = stringValue(objectValue(product.brand)?.name) ?? stringValue(product.brand);
  if (!brand) return undefined;
  return brand.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase() ? undefined : brand;
}

function parseProductPage(context: ProductPageParseContext) {
  const url = context.url.toString();
  const nodes = jsonLdNodes(context.$);
  const product = nodes.find((node) => nodeHasType(node, "Product"));
  if (!product) return null; // ordinary content page — not worth logging

  // Magento feeds the SEO meta title into Product.name, so every title arrives
  // with a " | Kontakt.ge" suffix. Left in place it reaches modelCodes() and
  // the title-similarity scorer as two extra tokens that no other store's
  // titles carry, which drags down every cross-store match for this shop.
  const title = stringValue(product.name)?.replace(/\s*\|\s*Kontakt\.ge\s*$/i, "").trim();

  // Brand hubs (/xiaomi, /canon) and promo pages (/shida-ganvadeba-24-tvemde)
  // also emit @type Product, but wrap the range in an AggregateOffer carrying
  // lowPrice/highPrice and priceCurrency "AZN" — a leftover from the parent
  // Azerbaijani storefront. Those are listings, not products: ingesting one
  // would invent a product whose "price" is the cheapest item of a whole brand,
  // priced in the wrong currency. Real products always carry a plain Offer.
  const offerNode = objectValues(product.offers)[0];
  if (offerNode && nodeHasType(offerNode, "AggregateOffer")) return null;

  if (!offerNode) {
    console.warn(`[kontakt] Product JSON-LD without offers: ${url}`);
    return null;
  }
  if (!title) {
    console.warn(`[kontakt] Product JSON-LD without name: ${url}`);
    return null;
  }

  // Guard the currency explicitly. Prices are stored as plain numbers with no
  // currency attached, so a page that ever starts quoting AZN must be dropped
  // rather than silently compared against GEL prices from every other store.
  const currency = stringValue(offerNode.priceCurrency)?.toUpperCase();
  if (currency && currency !== "GEL") {
    console.warn(`[kontakt] non-GEL priceCurrency ${currency}, skipping: ${url}`);
    return null;
  }

  const price = toNumber(offerNode.price);
  if (!price || price <= 0) {
    console.warn(`[kontakt] missing or zero offers.price: ${url}`);
    return null;
  }

  // The visible price is rendered client-side by Breeze, so JSON-LD is the only
  // server-side price source; there is no crossed-out old price in the markup.
  const externalId =
    stringValue(product.sku)
    ?? stringValue(product.mpn)
    ?? (context.$("[data-product-sku]").first().attr("data-product-sku")?.trim() || undefined);

  return {
    externalId,
    title,
    url,
    imageUrl: productImage(product.image),
    price,
    availability: availability(offerNode.availability),
    brand: brandName(product, title),
    // Kontakt emits no BreadcrumbList, so breadcrumbNames() is normally empty
    // and the slug has to come from the title. Georgian titles match few of the
    // mostly-English keyword rules, so expect a share of these to land in
    // `other` and get fixed by recategorize, exactly as TechnoBoom's did.
    categorySlug: categorySlugForSignals([...breadcrumbNames(nodes), title, context.url.pathname]),
  };
}

export const kontaktAdapter: ShopAdapter = {
  slug: "kontakt",
  name: "Kontakt",
  baseUrl: BASE_URL,
  // STORE_CONFIGS already marks kontakt enabled. Leaving this false meant the
  // shop.upsert in runner.ts created the Shop row disabled, so the first real
  // (non-dry-run) ingest skipped the store while dry runs looked healthy.
  // Only affects row creation — an existing Shop row keeps whatever it has.
  enabledByDefault: true,
  needsConfiguration: false,
  rateLimitMs: 2000,
  maxProductsPerRun: 42,
  listProductUrls,
  parseProductPage,
};
