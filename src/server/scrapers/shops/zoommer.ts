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

type ZoommerCategoryPage = {
  productsCount?: number;
  products?: ZoommerProduct[];
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

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)";
const CATEGORY_API_IDS: Partial<Record<FasmetriCategorySlug, number>> = {
  mobiles: 855,
  laptops: 531,
};
const CATEGORY_PAGE_URLS: Partial<Record<FasmetriCategorySlug, string>> = {
  mobiles: "https://zoommer.ge/mobiluri-telefonebi-c855",
  laptops: "https://zoommer.ge/leptopebi-c531",
};

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
  mobiles:                /^\/(?:ka\/)?mobiluri-telefonebi\//i,
  "phone-accessories":    /^\/(?:ka\/)?mobiluris-aqsesuarebi\//i,
  laptops:                /^\/(?:ka\/)?leptopebi\//i,
  tablets:                /^\/(?:ka\/)?planshetebi\//i,
  "tablet-accessories":   /^\/(?:ka\/)?planshetis-aqsesuarebi\//i,
  televisions:            /^\/(?:ka\/)?televizorebi\//i,
  audio:                  /^\/(?:ka\/)?(?:audio-sistema|yursasmenebi|yursasmenebi-buds|akustikuri-sistemebi)\//i,
  wearables:              /^\/(?:ka\/)?(?:smart-saatebi|fitnes-trekerebi-da-aqsesuarebi)\//i,
  gaming:                 /^\/(?:ka\/)?(?:gaming|playstation|nintendo|xbox|gaming-aqsesuarebi)\//i,
  monitors:               /^\/(?:ka\/)?(?:monitorebi|gaming-monitorebi)\//i,
  computers:              /^\/(?:ka\/)?all-in-one\//i,
  "computer-accessories": /^\/(?:ka\/)?(?:leptopis-aqsesuarebi|mekhsierebis-matareblebi|flesh-mekhsierebebi|it)\//i,
  "cables-adapters":      /^\/(?:ka\/)?(?:kabelebi|hdmi-lan-kabelebi)\//i,
  "photo-video":          /^\/(?:ka\/)?(?:foto-da-video-kamerebi|eqshen-kamerebi|dronebi-da-aqsesuarebi|proeqtorebi|foto-video-aqsesuarebi)\//i,
  "auto-accessories":     /^\/(?:ka\/)?manqanis-aqsesuarebi\//i,
  "home-appliances":      /^\/(?:ka\/)?(?:sakhlis-movla|mtversasrutebi)\//i,
  "small-appliances":     /^\/(?:ka\/)?(?:tavis-movla|samzareulo|tansacmlis-movla)\//i,
  sport:                  /^\/(?:ka\/)?skuterebi\//i,
  pets:                   /^\/(?:ka\/)?shinauri-ckhovelebi\//i,
  furniture:              /^\/(?:ka\/)?misaghebi\//i,
};

async function listProductUrls(categorySlug?: string) {
  const apiUrls = await listCurrentCategoryUrls(categorySlug);
  if (apiUrls?.length) return apiUrls;

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

async function listCurrentCategoryUrls(categorySlug?: string) {
  const slug = categorySlug as FasmetriCategorySlug | undefined;
  if (!slug) return null;
  const categoryId = CATEGORY_API_IDS[slug];
  const pageUrl = CATEGORY_PAGE_URLS[slug];
  if (!categoryId || !pageUrl) return null;

  try {
    const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
    const cookie = await fetchAccessCookie(pageUrl, userAgent);
    const firstPage = await fetchCategoryPage(categoryId, 1, pageUrl, cookie, userAgent);
    const pages = Math.ceil((firstPage.productsCount ?? firstPage.products?.length ?? 0) / 28);
    const products = [...(firstPage.products ?? [])];
    for (let page = 2; page <= pages; page += 1) {
      products.push(...((await fetchCategoryPage(categoryId, page, pageUrl, cookie, userAgent)).products ?? []));
    }
    const urls = new Map<string, string>();
    for (const product of products) {
      if (!product.route) continue;
      const url = new URL(product.route.replace(/^\//, ""), "https://zoommer.ge/").toString();
      urls.set(canonicalProductKey(url), url);
    }
    return [...urls.values()].sort((left, right) => productId(right) - productId(left));
  } catch (error) {
    console.warn(`Zoommer category API discovery failed for ${slug}; falling back to sitemap:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchAccessCookie(pageUrl: string, userAgent: string) {
  const response = await fetch(pageUrl, {
    headers: { "user-agent": userAgent, "accept-language": "ka" },
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  const tokens = [...setCookie.matchAll(/zoommer-access_token=([^;]+)/g)].map((match) => match[1]);
  if (!tokens.length) throw new Error("missing zoommer-access_token cookie");
  return `zoommer-access_token=${tokens[tokens.length - 1]}`;
}

async function fetchCategoryPage(categoryId: number, page: number, referer: string, cookie: string, userAgent: string) {
  const url = new URL("https://zoommer.ge/api/proxy/v1/Products/v3");
  url.searchParams.set("CategoryId", String(categoryId));
  url.searchParams.set("Page", String(page));
  url.searchParams.set("Limit", "28");
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "application/json, text/plain, */*",
      "accept-language": "ka",
      os: "web",
      referer,
      cookie,
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<ZoommerCategoryPage>;
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
    mobiles:                ["/mobiluri-telefonebi-c855"],
    "phone-accessories":    ["/mobiluris-aqsesuarebi-c538"],
    laptops:                ["/leptopebi-c531"],
    tablets:                ["/planshetebi-c877"],
    "tablet-accessories":   ["/planshetis-aqsesuarebi-c539"],
    televisions:            ["/televizorebi-c505"],
    audio:                  ["/audio-sistema-c528", "/yursasmenebi-c533", "/yursasmenebi-buds-c887", "/akustikuri-sistemebi-c532"],
    wearables:              ["/smart-saatebi-c873", "/fitnes-trekerebi-da-aqsesuarebi-c517"],
    gaming:                 ["/gaming-c463", "/gaming-aqsesuarebi-c893", "/playstation-c688", "/nintendo-c927"],
    monitors:               ["/monitorebi-c503", "/gaming-monitorebi-c1140"],
    computers:              ["/all-in-one-c706"],
    "computer-accessories": ["/leptopis-aqsesuarebi-c700", "/mekhsierebis-matareblebi-c519", "/flesh-mekhsierebebi-c1032", "/it-c460"],
    "cables-adapters":      ["/kabelebi-c1145", "/hdmi-lan-kabelebi-c507"],
    "photo-video":          ["/foto-da-video-kamerebi-c858", "/eqshen-kamerebi-c864", "/dronebi-da-aqsesuarebi-c865", "/proeqtorebi-c642", "/foto-video-aqsesuarebi-c732"],
    "auto-accessories":     ["/manqanis-aqsesuarebi-c481"],
    "home-appliances":      ["/sakhlis-movla-c500", "/mtversasrutebi-c778"],
    "small-appliances":     ["/tavis-movla-c490", "/samzareulo-c495", "/tansacmlis-movla-c1262"],
    sport:                  ["/skuterebi-c461"],
    pets:                   ["/shinauri-ckhovelebi-c469"],
    furniture:              ["/misaghebi-c501"],
  },
  preferProductUrlsForCategory: true,
  parseDocument: parseCategoryDocument,
  listProductUrls,
  parseProductPage,
};
