import { loadProductUrlsFromIndexes } from "@/server/scrapers/sitemap";
import { FasmetriCategorySlug } from "@/config/categoryMapping";
import { categorySlugForSignals } from "@/server/scrapers/categories";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

type ZoommerProduct = {
  id?: number | string;
  name?: string;
  price?: number | string;
  previousPrice?: number | string | null;
  imageUrl?: string;
  isInStock?: boolean;
  parentCategoryName?: string;
  categoryName?: string;
  route?: string;
};

type ZoommerShareData = {
  name?: string;
  price?: number | string;
  imageUrl?: string;
  availability?: boolean;
  brandName?: string;
  categoryName?: string;
};

type ZoommerPageProps = {
  sharePageData?: ZoommerShareData;
  initialProductData?: {
    product?: ZoommerProduct;
    availabilityInStores?: Array<{ inStock?: boolean }>;
  };
};

type ZoommerNextData = {
  props?: {
    pageProps?: ZoommerPageProps;
  };
};

type JsonLdListItem = {
  item?: {
    name?: string;
    image?: string;
    url?: string;
    description?: string | null;
    sku?: string;
    brand?: { name?: string | null };
    offers?: {
      price?: number | string;
      priceCurrency?: string;
      availability?: string;
    };
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

const categoryProductPathPrefixes: Partial<Record<FasmetriCategorySlug, RegExp>> = {
  mobiles: /^\/(?:ka\/)?mobiluri-telefonebi\//i,
};

async function listProductUrls(categorySlug?: string) {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const urls = await loadProductUrlsFromIndexes(["https://zoommer.ge/sitemap_index.xml"], {
    includeSitemap: /\/sitemap\/products\//i,
    includeProductUrl: /-p\d+$/i,
    userAgent,
  });

  const deduped = new Map<string, string>();
  for (const candidate of urls) {
    const parsed = new URL(candidate);
    if (/^\/(en|ru)\//i.test(parsed.pathname)) continue;
    deduped.set(canonicalProductKey(candidate), candidate);
  }
  const categoryFilter = categoryProductPathPrefixes[categorySlug as FasmetriCategorySlug];
  const values = [...deduped.values()].filter((candidate) => {
    if (!categoryFilter) return true;
    return categoryFilter.test(new URL(candidate).pathname);
  });
  return values.sort((left, right) => productId(right) - productId(left));
}

function parseNextData({ $ }: ProductPageParseContext) {
  const raw = $("#__NEXT_DATA__").first().text().trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZoommerNextData;
  } catch {
    return null;
  }
}

function parseAvailability(pageProps?: ZoommerPageProps): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const direct = pageProps?.initialProductData?.product?.isInStock;
  if (typeof direct === "boolean") return direct ? "IN_STOCK" : "OUT_OF_STOCK";

  const share = pageProps?.sharePageData?.availability;
  if (typeof share === "boolean") return share ? "IN_STOCK" : "OUT_OF_STOCK";

  const stores = pageProps?.initialProductData?.availabilityInStores;
  if (Array.isArray(stores) && stores.length > 0) {
    return stores.some((store) => store.inStock) ? "IN_STOCK" : "OUT_OF_STOCK";
  }
  return "UNKNOWN";
}

function parseProductPage(context: ProductPageParseContext) {
  const nextData = parseNextData(context);
  const pageProps = nextData?.props?.pageProps;
  const product = pageProps?.initialProductData?.product;
  const share = pageProps?.sharePageData;

  const title = product?.name?.trim() || share?.name?.trim() || context.$("h1").first().text().trim();
  const price = toNumber(product?.price) ?? toNumber(share?.price);
  if (!title || price === undefined || price <= 0) return null;

  const oldPrice = toNumber(product?.previousPrice);
  const normalizedOldPrice = oldPrice && oldPrice > price ? oldPrice : undefined;
  const imageUrl = product?.imageUrl || share?.imageUrl;

  return {
    externalId: product?.id ? String(product.id) : undefined,
    title,
    url: context.url.toString(),
    imageUrl,
    price,
    oldPrice: normalizedOldPrice,
    availability: parseAvailability(pageProps),
    brand: share?.brandName,
    categorySlug: categorySlugForSignals([
      share?.categoryName,
      product?.parentCategoryName,
      product?.categoryName,
      product?.route,
      title,
    ], "other"),
  };
}

function parseCategoryDocument($: ProductPageParseContext["$"], categorySlug: string) {
  const offers = new Map<string, ReturnType<typeof parseJsonLdProduct>>();
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as { itemListElement?: JsonLdListItem[] } | Array<{ itemListElement?: JsonLdListItem[] }>;
      const blocks = Array.isArray(data) ? data : [data];
      for (const block of blocks) {
        for (const entry of block.itemListElement ?? []) {
          const offer = parseJsonLdProduct(entry, categorySlug);
          if (offer) offers.set(offer.url, offer);
        }
      }
    } catch {
      // Ignore unrelated JSON-LD blocks.
    }
  });
  return [...offers.values()].filter((offer): offer is NonNullable<typeof offer> => Boolean(offer));
}

function parseJsonLdProduct(entry: JsonLdListItem, categorySlug: string) {
  const item = entry.item;
  const title = item?.name?.trim();
  const price = toNumber(item?.offers?.price);
  const rawUrl = item?.url?.trim();
  if (!title || !rawUrl || price === undefined || price <= 0) return null;
  const url = new URL(rawUrl, "https://zoommer.ge").toString();
  const availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" = item?.offers?.availability?.toLowerCase().includes("instock") ? "IN_STOCK" : "UNKNOWN";
  const fallbackCategory = categorySlug as FasmetriCategorySlug;
  return {
    externalId: canonicalProductKey(url),
    title,
    url,
    imageUrl: item?.image,
    price,
    availability,
    brand: item?.brand?.name ?? undefined,
    description: item?.description ?? undefined,
    categorySlug: categorySlugForSignals([categorySlug, title, rawUrl], fallbackCategory),
    breadcrumbs: [categorySlug, rawUrl],
  };
}

export const zoommerAdapter: ShopAdapter = {
  slug: "zoommer",
  name: "Zoommer",
  baseUrl: "https://zoommer.ge",
  enabledByDefault: false,
  needsConfiguration: false,
  rateLimitMs: 3000,
  maxProductsPerRun: 60,
  categoryUrls: {
    mobiles: ["/mobiluri-telefonebi-c855"],
  },
  preferProductUrlsForCategory: true,
  parseDocument: parseCategoryDocument,
  listProductUrls,
  parseProductPage,
};
