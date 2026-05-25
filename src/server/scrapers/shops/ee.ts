import { loadProductUrlsFromIndexes } from "@/server/scrapers/sitemap";
import { categorySlugForSignals } from "@/server/scrapers/categories";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

type EliteProduct = {
  id?: number | string;
  name?: string;
  price?: number | string;
  previousPrice?: number | string | null;
  imageUrl?: string;
  hasDiscount?: boolean;
  parentCategoryName?: string;
  categoryName?: string;
  route?: string;
};

type EliteNextData = {
  props?: {
    pageProps?: {
      initialProductData?: {
        product?: EliteProduct;
        availabilityInStores?: Array<{ inStock?: boolean }>;
      };
    };
  };
};

type EliteLdProduct = {
  "@type"?: string;
  name?: string;
  sku?: string | number;
  image?: string | string[];
  brand?: string | { name?: string };
  offers?: {
    price?: number | string;
    availability?: string;
  };
};

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@sazoge.ge)";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const amount = Number.parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(amount) ? amount : undefined;
}

function canonicalProductKey(rawUrl: string) {
  const url = new URL(rawUrl);
  const idMatch = url.pathname.match(/-p(\d+)$/i);
  if (idMatch) return idMatch[1];
  return url.pathname.replace(/^\/(en|ru)\//i, "/");
}

function productId(rawUrl: string) {
  const match = new URL(rawUrl).pathname.match(/-p(\d+)$/i);
  return match ? Number(match[1]) : 0;
}

function parseNextData({ $ }: ProductPageParseContext) {
  const raw = $("#__NEXT_DATA__").first().text().trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EliteNextData;
  } catch {
    return null;
  }
}

function parseProductJsonLd({ $ }: ProductPageParseContext) {
  const scripts = $('script[type="application/ld+json"]')
    .toArray()
    .map((node) => $(node).text().trim())
    .filter(Boolean);

  for (const scriptText of scripts) {
    try {
      const parsed = JSON.parse(scriptText) as EliteLdProduct | EliteLdProduct[];
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const product = values.find((value) => value["@type"] === "Product");
      if (product) return product;
    } catch {
      continue;
    }
  }
  return null;
}

function parseAvailability(
  nextData: EliteNextData | null,
  ldProduct: EliteLdProduct | null,
): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const stores = nextData?.props?.pageProps?.initialProductData?.availabilityInStores;
  if (Array.isArray(stores) && stores.length > 0) {
    return stores.some((store) => store.inStock) ? "IN_STOCK" : "OUT_OF_STOCK";
  }
  const offerAvailability = ldProduct?.offers?.availability?.toLowerCase();
  if (!offerAvailability) return "UNKNOWN";
  if (offerAvailability.includes("instock")) return "IN_STOCK";
  if (offerAvailability.includes("outofstock")) return "OUT_OF_STOCK";
  return "UNKNOWN";
}

function parseBrand(ldProduct: EliteLdProduct | null) {
  if (!ldProduct?.brand) return undefined;
  if (typeof ldProduct.brand === "string") return ldProduct.brand;
  return ldProduct.brand.name;
}

async function listProductUrls() {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const urls = await loadProductUrlsFromIndexes(["https://ee.ge/sitemap.xml"], {
    includeSitemap: /\/sitemap\/products\//i,
    includeProductUrl: /-p\d+$/i,
    userAgent,
  });

  const deduped = new Map<string, string>();
  for (const candidate of urls) {
    const parsed = new URL(candidate);
    const existing = deduped.get(canonicalProductKey(candidate));
    if (!existing) {
      deduped.set(canonicalProductKey(candidate), candidate);
      continue;
    }
    const existingPath = new URL(existing).pathname;
    const shouldPreferCurrent = /^\/(en|ru)\//i.test(existingPath) && !/^\/(en|ru)\//i.test(parsed.pathname);
    if (shouldPreferCurrent) deduped.set(canonicalProductKey(candidate), candidate);
  }
  return [...deduped.values()].sort((left, right) => productId(right) - productId(left));
}

function parseProductPage(context: ProductPageParseContext) {
  const nextData = parseNextData(context);
  const ldProduct = parseProductJsonLd(context);
  const product = nextData?.props?.pageProps?.initialProductData?.product;

  const title = product?.name?.trim() || ldProduct?.name?.trim() || context.$("h1").first().text().trim();
  const price = toNumber(product?.price) ?? toNumber(ldProduct?.offers?.price);
  if (!title || price === undefined || price <= 0) return null;

  const oldPrice = toNumber(product?.previousPrice);
  const normalizedOldPrice = oldPrice && oldPrice > price ? oldPrice : undefined;
  const imageFromLd = Array.isArray(ldProduct?.image) ? ldProduct?.image[0] : ldProduct?.image;
  const imageUrl = product?.imageUrl || imageFromLd;

  return {
    externalId: product?.id ? String(product.id) : ldProduct?.sku ? String(ldProduct.sku) : undefined,
    title,
    url: context.url.toString(),
    imageUrl,
    price,
    oldPrice: normalizedOldPrice,
    availability: parseAvailability(nextData, ldProduct),
    brand: parseBrand(ldProduct),
    categorySlug: categorySlugForSignals([
      product?.parentCategoryName,
      product?.categoryName,
      product?.route,
      title,
    ], "other"),
  };
}

export const eeAdapter: ShopAdapter = {
  slug: "ee",
  name: "Elite Electronics",
  baseUrl: "https://ee.ge",
  enabledByDefault: false,
  needsConfiguration: false,
  rateLimitMs: 5000,
  maxProductsPerRun: 36,
  listProductUrls,
  parseProductPage,
};
