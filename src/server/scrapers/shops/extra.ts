import { categorySlugForSignals } from "@/server/scrapers/categories";
import { JsonLdNode, jsonLdNodes, nodeHasType, objectValue, objectValues, stringValue } from "@/server/scrapers/json-ld";
import { loadProductUrlsFromIndexes } from "@/server/scrapers/sitemap";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";

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

async function listProductUrls() {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const urls = await loadProductUrlsFromIndexes(["https://extra.ge/sitemaps/sitemaps.xml"], {
    includeSitemap: /\/sitemaps\/products\/sitemap-\d+\.xml$/i,
    includeProductUrl: /\/product\//i,
    userAgent,
  });
  return [...new Set(urls)];
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

export const extraAdapter: ShopAdapter = {
  slug: "extra",
  name: "Extra",
  baseUrl: "https://extra.ge",
  enabledByDefault: false,
  needsConfiguration: false,
  rateLimitMs: 3500,
  maxProductsPerRun: 42,
  listProductUrls,
  parseProductPage,
};
