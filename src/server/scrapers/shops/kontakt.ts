import { categorySlugForSignals } from "@/server/scrapers/categories";
import { JsonLdNode, jsonLdNodes, nodeHasType, objectValue, objectValues, stringValue } from "@/server/scrapers/json-ld";
import { extractLocs } from "@/server/scrapers/sitemap";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)";
const BASE_URL = "https://kontakt.ge";

// Kontakt's sitemap layout is unverified (site is unreachable from cloud IPs;
// first validation happens on the GE runner via `import-store --dry-run`).
// Try the standard locations in order and tolerate individual failures — the
// JSON-LD gate in parseProductPage drops any non-product page that slips
// through, so an over-broad URL list costs fetches, never bad data.
const SITEMAP_CANDIDATES = [
  `${BASE_URL}/sitemap.xml`,
  `${BASE_URL}/sitemap_index.xml`,
  `${BASE_URL}/sitemap/sitemap.xml`,
  `${BASE_URL}/wp-sitemap.xml`,
];

// Child sitemaps worth expanding when the entry point is an index.
const CHILD_SITEMAP_FILTER = /(product|item|shop|catalog|sitemap)[^/]*\.xml(?:[?#].*)?$/i;
const MAX_CHILD_SITEMAPS = 12;

// Paths that are clearly not product detail pages.
const NON_PRODUCT_PATH = /\/(?:category|categories|brand|brands|blog|news|page|pages|about|contact|cart|checkout|login|register|compare|wishlist|search|promo|stores?)(?:\/|$)/i;

async function fetchLocsSafe(url: string, userAgent: string): Promise<string[]> {
  try {
    const response = await fetch(url, { headers: { "user-agent": userAgent }, cache: "no-store" });
    if (!response.ok) return [];
    return extractLocs(await response.text());
  } catch {
    return [];
  }
}

async function listProductUrls() {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const pageUrls = new Set<string>();

  for (const candidate of SITEMAP_CANDIDATES) {
    const locs = await fetchLocsSafe(candidate, userAgent);
    if (!locs.length) continue;

    const childSitemaps = locs.filter((loc) => /\.xml(?:[?#].*)?$/i.test(loc) && CHILD_SITEMAP_FILTER.test(loc)).slice(0, MAX_CHILD_SITEMAPS);
    const directPages = locs.filter((loc) => !/\.xml(?:[?#].*)?$/i.test(loc));
    for (const page of directPages) pageUrls.add(page);
    for (const child of childSitemaps) {
      for (const loc of await fetchLocsSafe(child, userAgent)) {
        if (!/\.xml(?:[?#].*)?$/i.test(loc)) pageUrls.add(loc);
      }
    }
    if (pageUrls.size) break; // first working sitemap entry point wins
  }

  return [...pageUrls].filter((raw) => {
    try {
      const url = new URL(raw);
      if (!/(^|\.)kontakt\.ge$/i.test(url.hostname)) return false;
      const path = url.pathname;
      if (path === "/" || NON_PRODUCT_PATH.test(path)) return false;
      // Localized duplicates: keep only the default-locale path.
      if (/^\/(en|ru)\//i.test(path)) return false;
      return true;
    } catch {
      return false;
    }
  });
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

function availability(value: unknown): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const signal = stringValue(value)?.toLocaleLowerCase();
  if (signal?.includes("outofstock")) return "OUT_OF_STOCK";
  if (signal?.includes("instock")) return "IN_STOCK";
  return "UNKNOWN";
}

function brandName(product: JsonLdNode) {
  return stringValue(objectValue(product.brand)?.name) ?? stringValue(product.brand);
}

function parseProductPage(context: ProductPageParseContext) {
  const nodes = jsonLdNodes(context.$);
  const product = nodes.find((node) => nodeHasType(node, "Product"));
  const offer = product ? objectValues(product.offers)[0] : undefined;
  const title = stringValue(product?.name)?.trim();
  const price = toNumber(offer?.price);
  if (!product || !title || !price) return null;

  return {
    externalId: stringValue(product.sku) ?? stringValue(product.mpn),
    title,
    url: context.url.toString(),
    imageUrl: productImage(product.image),
    price,
    availability: availability(offer?.availability),
    brand: brandName(product),
    categorySlug: categorySlugForSignals([...breadcrumbNames(nodes), title, context.url.pathname]),
  };
}

export const kontaktAdapter: ShopAdapter = {
  slug: "kontakt",
  name: "Kontakt",
  baseUrl: BASE_URL,
  enabledByDefault: false,
  needsConfiguration: false,
  rateLimitMs: 4000,
  maxProductsPerRun: 42,
  listProductUrls,
  parseProductPage,
};
