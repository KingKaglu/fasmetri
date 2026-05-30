import { FasmetriCategorySlug } from "@/config/categoryMapping";
import { categorySlugForSignals } from "@/server/scrapers/categories";
import { jsonLdNodes, nodeHasType, objectValue, objectValues, stringValue } from "@/server/scrapers/json-ld";
import { loadProductUrlsFromIndexes } from "@/server/scrapers/sitemap";
import { JsonLdNode } from "@/server/scrapers/json-ld";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractImageString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  // ImageObject: {"@type": "ImageObject", "url": "..."}
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return stringValue(obj.url) ?? stringValue(obj["@id"]) ?? stringValue(obj.contentUrl);
  }
  return undefined;
}

function imageUrl(value: unknown, baseUrl: URL) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const raw = extractImageString(candidate);
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

// PCShop uses WooCommerce. Product URLs are at /shop/{product-slug}/.
// Category is inferred from JSON-LD breadcrumbs + title at scrape time.
// The path filters below are best-effort heuristics based on WooCommerce slugs
// PCShop uses; verified against sitemap samples. May need refinement.
// PCShop WooCommerce slugs are hyphenated product titles, e.g. /shop/lenovo-thinkpad-t14-gen5-...
// Model names appear after the brand with a hyphen separator, so we match [-/]keyword, not \/keyword.
const PCSHOP_CATEGORY_PATH_FILTERS: Partial<Record<FasmetriCategorySlug, RegExp>> = {
  laptops:              /[-/](?:laptop|noutbuk|macbook|notebook|thinkpad|thinkbook|ideapad|legion|loq|yoga-(?:slim|pro|book|[0-9])|zenbook|vivobook|expertbook|proart|aspire|nitro|predator|swift|spin|travelmate|extensa|chromebook|elitebook|probook|zbook|omnibook|pavilion|spectre|envy|omen|victus|inspiron|xps|latitude|vostro|precision|alienware|gram|katana|vector|raider|stealth|sword|cyborg|crosshair|creator-(?:m|z|[0-9])|prestige|summit-e|galaxy-?book|matebook|surface-(?:laptop|book)|rog-|tuf-|strix|zephyrus)/i,
  monitors:             /[-/](?:monitor|display|lcd|led-display|curved|ultrawide|gaming-monitor)/i,
  computers:            /[-/](?:desktop-pc|mini-pc|all-in-one|nettop|beelink|minisforum|acemagic|intel-nuc|workstation|imac|mac-mini|mac-pro|elitedesk|prodesk|thinkcentre|thinkstation)/i,
  gaming:               /[-/](?:gaming-(?:pc|chair|desk|keyboard|mouse|headset|pad)|razer|corsair-k|logitech-g|steelseries|redragon|peripherals)/i,
  "computer-accessories": /[-/](?:keyboard|mouse-(?!pad)|ram-|ssd-|hdd-|nvme|cooler|cpu-cooler|case-fan|power-supply|motherboard|graphics-card|gpu-)/i,
  "cables-adapters":    /[-/](?:cable|adapter|hub|dock|usb-c|hdmi-cable|displayport|thunderbolt|kvm)/i,
  audio:                /[-/](?:headset|headphone|speaker|soundbar|microphone|webcam|earbuds)/i,
  "photo-video":        /[-/](?:webcam|capture-card|streaming|camera-(?!bag|case))/i,
  tablets:              /[-/](?:tablet|ipad|galaxy-tab)/i,
  "tablet-accessories": /[-/](?:tablet-case|tablet-keyboard|stylus|tablet-stand)/i,
};

async function listProductUrls(categorySlug?: string) {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const urls = await loadProductUrlsFromIndexes(["https://pcshop.ge/sitemap.xml"], {
    includeSitemap: /\/sitemap-post-type-product(?:-\d+)?\.xml$/i,
    includeProductUrl: /\/shop\//i,
    userAgent,
  });

  const unique = [...new Set(urls.filter((url) => !new URL(url).pathname.startsWith("/ka-ge/")))];

  if (!categorySlug) return unique;

  const pathFilter = PCSHOP_CATEGORY_PATH_FILTERS[categorySlug as FasmetriCategorySlug];
  if (!pathFilter) return unique; // No filter for this category — return all

  const filtered = unique.filter((url) => pathFilter.test(new URL(url).pathname));
  // Fall back to full list if filter is too aggressive (returns nothing)
  return filtered.length > 0 ? filtered : unique;
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
  enabledByDefault: true,
  needsConfiguration: false,
  rateLimitMs: 3000,
  maxProductsPerRun: 200,
  preferProductUrlsForCategory: true,
  listProductUrls,
  parseProductPage,
};
