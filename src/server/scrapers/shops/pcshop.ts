import { categorySlugForSignals } from "@/server/scrapers/categories";
import { jsonLdNodes, nodeHasType, objectValue, objectValues, stringValue } from "@/server/scrapers/json-ld";
import { loadProductUrlsFromIndexes } from "@/server/scrapers/sitemap";
import { JsonLdNode } from "@/server/scrapers/json-ld";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@sazoge.ge)";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function imageUrl(value: unknown, baseUrl: URL) {
  const raw = Array.isArray(value) ? stringValue(value[0]) : stringValue(value);
  if (!raw) return undefined;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function breadcrumbNames(nodes: JsonLdNode[]) {
  const breadcrumb = nodes.find((node) => nodeHasType(node, "BreadcrumbList"));
  return objectValues(breadcrumb?.itemListElement)
    .map((entry) => stringValue(objectValue(entry.item)?.name) ?? stringValue(entry.name))
    .filter(Boolean) as string[];
}

function offerPrice(product: JsonLdNode) {
  const offer = objectValues(product.offers)[0];
  if (!offer) return undefined;
  const direct = toNumber(offer.price);
  if (direct) return direct;
  const specification = objectValues(offer.priceSpecification)[0];
  return toNumber(specification?.price);
}

function availability(value: unknown): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const signal = stringValue(value)?.toLocaleLowerCase();
  if (signal?.includes("outofstock")) return "OUT_OF_STOCK";
  if (signal?.includes("instock")) return "IN_STOCK";
  return "UNKNOWN";
}

async function listProductUrls() {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const urls = await loadProductUrlsFromIndexes(["https://pcshop.ge/sitemap.xml"], {
    includeSitemap: /\/sitemap-post-type-product(?:-\d+)?\.xml$/i,
    includeProductUrl: /\/shop\//i,
    userAgent,
  });

  return [...new Set(urls.filter((url) => !new URL(url).pathname.startsWith("/ka-ge/")))];
}

function parseProductPage(context: ProductPageParseContext) {
  const nodes = jsonLdNodes(context.$);
  const product = nodes.find((node) => nodeHasType(node, "Product"));
  const offer = product ? objectValues(product.offers)[0] : undefined;
  const title = stringValue(product?.name)?.trim();
  const price = product ? offerPrice(product) : undefined;
  if (!product || !title || !price) return null;

  return {
    externalId: stringValue(product.sku),
    title,
    url: context.url.toString(),
    imageUrl: imageUrl(product.image, context.url),
    price,
    availability: availability(offer?.availability),
    categorySlug: categorySlugForSignals([...breadcrumbNames(nodes), title, context.url.pathname], "computers"),
  };
}

export const pcshopAdapter: ShopAdapter = {
  slug: "pcshop",
  name: "PCShop",
  baseUrl: "https://pcshop.ge",
  enabledByDefault: false,
  needsConfiguration: false,
  rateLimitMs: 3000,
  maxProductsPerRun: 48,
  listProductUrls,
  parseProductPage,
};
