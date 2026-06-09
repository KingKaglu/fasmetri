import { fetchSitemapLocs, loadProductUrlsFromIndexes } from "@/server/scrapers/sitemap";
import { FasmetriCategorySlug } from "@/config/categoryMapping";
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

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";
const SITEMAP_BASE = "https://ee.ge/sitemap/products/";
const LIVE_CATEGORY_URLS: Partial<Record<FasmetriCategorySlug, string>> = {
  mobiles: "https://ee.ge/en/mobile-phone-c377t",
  laptops: "https://ee.ge/noutbuqebi-c58t",
};

// Maps Fasmetri category slugs to EE's product sitemap slugs.
// Each sitemap covers a set of products; multiple sitemaps may overlap.
// Outlet products (path: autleti/) appear across sitemaps — detected in parseProductPage.
const EE_CATEGORY_SITEMAPS: Partial<Record<FasmetriCategorySlug, string[]>> = {
  mobiles:                ["mobile-and-smart-tech-c29", "mobile-and-smart-tech-c320"],
  "phone-accessories":    ["mobile-and-smart-tech-c82", "computer-equipment-and-accessories-c3"],
  laptops:                ["computers-and-gaming-c27"],
  televisions:            ["tv-and-home-theatre-c31", "tv-and-audio-c327"],
  audio:                  ["tv-and-audio-c15", "computers-and-gaming-c326"],
  wearables:              ["mobile-and-smart-tech-c334", "mobile-and-smart-tech-c82"],
  gaming:                 ["gartoba-c87", "computers-and-gaming-c323"],
  monitors:               ["computers-and-gaming-c23"],
  computers:              ["computers-and-gaming-c27", "it-products-c322"],
  "computer-accessories": ["computers-and-gaming-c92", "computers-and-gaming-c79"],
  "cables-adapters":      ["computers-and-gaming-c79", "computer-equipment-and-accessories-c3"],
  refrigerators:          ["domestic-appliances-c25"],
  "washing-machines":     ["domestic-appliances-c16", "domestic-appliances-c17"],
  "home-appliances":      ["domestic-appliances-c16", "domestic-appliances-c293", "house-and-cleaning-c294", "haeris-movla-c84"],
  "small-appliances":     ["small-domestic-appliances-c30", "small-domestic-appliances-c90", "small-domestic-appliances-c83", "small-domestic-appliances-c333"],
  "photo-video":          ["photo-video-entertainment-c81", "enertainment-c28", "photo-video-entertainment-c328", "photo-video-c331"],
  beauty:                 ["personal-care-c311"],
  other:                  ["gartoba-c88", "smart-home-accessories-c321"],
};

// Path prefix filters per category — keeps only Georgian or canonical English paths,
// drops /en/ and /ru/ duplicates to avoid counting the same product twice.
const EE_CATEGORY_PATH_FILTERS: Partial<Record<FasmetriCategorySlug, RegExp>> = {
  mobiles:                /^\/(mobilurebi-da-chkviani-teqnika|en\/mobile-and-smart-tech|autleti|en\/outlet)\//i,
  "phone-accessories":    /^\/(mobilurebi-da-chkviani-teqnika|en\/mobile-and-smart-tech|kompiuterebi-da-geimingi|en\/computers-and-gaming)\//i,
  laptops:                /^\/(kompiuterebi-da-geimingi|en\/computers-and-gaming|autleti|en\/outlet)\//i,
  televisions:            /^\/(televizorebi-da-audio-motsyobilobebi|en\/tv-and-audio|autleti|en\/outlet)\//i,
  audio:                  /^\/(televizorebi-da-audio-motsyobilobebi|en\/tv-and-audio|kompiuterebi-da-geimingi|en\/computers-and-gaming)\//i,
  wearables:              /^\/(mobilurebi-da-chkviani-teqnika|en\/mobile-and-smart-tech|autleti|en\/outlet)\//i,
  gaming:                 /^\/(kompiuterebi-da-geimingi|en\/computers-and-gaming|autleti|en\/outlet)\//i,
  monitors:               /^\/(kompiuterebi-da-geimingi|en\/computers-and-gaming)\//i,
  computers:              /^\/(kompiuterebi-da-geimingi|en\/computers-and-gaming|autleti|en\/outlet)\//i,
  "computer-accessories": /^\/(kompiuterebi-da-geimingi|en\/computers-and-gaming)\//i,
  "cables-adapters":      /^\/(kompiuterebi-da-geimingi|en\/computers-and-gaming)\//i,
  refrigerators:          /^\/(sayofackhovrebo-teqnika|en\/domestic-appliances|autleti|en\/outlet)\//i,
  "washing-machines":     /^\/(sayofackhovrebo-teqnika|en\/domestic-appliances|autleti|en\/outlet)\//i,
  "home-appliances":      /^\/(sayofackhovrebo-teqnika|en\/domestic-appliances)\//i,
  "small-appliances":     /^\/(tsvrili-sayofackhovrebo-teqnika|en\/small-domestic-appliances|tavis-movla|en\/personal-care)\//i,
  "photo-video":          /^\/(foto-video-da-gartoba|en\/photo-video-entertainment|en\/photo-video)\//i,
  beauty:                 /^\/(tavis-movla|en\/personal-care)\//i,
  other:                  /^\/(mobilurebi-da-chkviani-teqnika|en\/mobile-and-smart-tech|kompiuterebi-da-geimingi|en\/computers-and-gaming|televizorebi-da-audio-motsyobilobebi|foto-video-da-gartoba)\//i,
};

const EE_LAPTOP_URL_HINT =
  /(?:notebook|laptop|macbook|thinkpad|thinkbook|ideapad|legion|loq|yoga|vivobook|zenbook|expertbook|probook|elitebook|zbook|omnibook|pavilion|omen|victus|aspire|nitro|predator|swift|travelmate|extensa|inspiron|latitude|vostro|xps|tuf|rog|katana|cyborg|prestige|modern|book-rs|matebook|surface)/i;
const EE_LAPTOP_URL_EXCLUDE =
  /(?:monitor|bag|case|sleeve|backpack|keyboard|mouse|cooler|stand|adapter|charger|dicota|legion-(?:r|y|k)\d)/i;

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

function productUrlKey(rawUrl: string) {
  const id = productId(rawUrl);
  return id ? String(id) : canonicalProductKey(rawUrl);
}

function productLinksFromHtml(html: string, baseUrl: string) {
  const urls = new Map<string, string>();
  for (const match of html.matchAll(/href=["']([^"']+-p[0-9]+[^"']*)["']/gi)) {
    const href = match[1];
    try {
      const url = new URL(href, baseUrl).toString();
      urls.set(productUrlKey(url), url);
    } catch {
      // Ignore malformed or script-generated links.
    }
  }
  return urls;
}

function maxPaginationPage(html: string) {
  const beforeItemsPerPage = html.split(/Items per page|პროდუქტები თითო გვერდზე/i)[0] ?? html;
  const explicitPages = [...beforeItemsPerPage.matchAll(/[?&]page=([0-9]{1,3})/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100);
  if (explicitPages.length) return Math.max(...explicitPages);

  const paginationTail = beforeItemsPerPage.slice(-3000);
  const visiblePages = [...paginationTail.matchAll(/(?:>|page=)([0-9]{1,3})(?:<|&|["'])/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100);
  return visiblePages.length ? Math.max(...visiblePages) : 1;
}

async function listLiveCategoryUrls(categorySlug?: string, userAgent = DEFAULT_USER_AGENT) {
  const pageUrl = categorySlug ? LIVE_CATEGORY_URLS[categorySlug as FasmetriCategorySlug] : undefined;
  if (!pageUrl) return null;

  const fetchCategoryPage = async (page: number) => {
    const url = page === 1 ? pageUrl : `${pageUrl}?page=${page}`;
    const response = await fetch(url, {
      headers: { "user-agent": userAgent, "accept-language": "ka,en" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return { url, html };
  };

  try {
    const first = await fetchCategoryPage(1);
    const pages = maxPaginationPage(first.html);
    const urls = new Map(productLinksFromHtml(first.html, first.url));
    for (let page = 2; page <= pages; page += 1) {
      const result = await fetchCategoryPage(page);
      for (const [key, url] of productLinksFromHtml(result.html, result.url)) {
        urls.set(key, url);
      }
    }
    if (urls.size > 0) return [...urls.values()];
  } catch (error) {
    console.warn(`EE live category discovery failed for ${categorySlug}; falling back to sitemap:`, error instanceof Error ? error.message : error);
  }

  return null;
}

function isOutletPath(pathname: string): boolean {
  return /^\/(autleti|en\/outlet|ru\/)\//i.test(pathname);
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

async function listProductUrls(categorySlug?: string) {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  const liveUrls = await listLiveCategoryUrls(categorySlug, userAgent);
  if (liveUrls?.length) return liveUrls;

  const sitemapSlugs = categorySlug
    ? EE_CATEGORY_SITEMAPS[categorySlug as FasmetriCategorySlug]
    : undefined;

  const rawUrls: string[] = [];

  if (sitemapSlugs?.length) {
    // Load specific product sitemaps directly (they are leaf sitemaps, not indexes)
    for (const slug of sitemapSlugs) {
      try {
        const locs = await fetchSitemapLocs(`${SITEMAP_BASE}${slug}.xml`, userAgent);
        for (const loc of locs) {
          if (/-p\d+$/i.test(loc)) rawUrls.push(loc);
        }
      } catch {
        // Skip inaccessible sitemaps silently
      }
    }
  } else {
    // Full catalog: load from the main sitemap index
    const all = await loadProductUrlsFromIndexes(["https://ee.ge/sitemap.xml"], {
      includeSitemap: /\/sitemap\/products\//i,
      includeProductUrl: /-p\d+$/i,
      userAgent,
    });
    rawUrls.push(...all);
  }

  // Deduplicate by canonical key: prefer Georgian path over en/ru duplicates
  const deduped = new Map<string, string>();
  for (const candidate of rawUrls) {
    const key = canonicalProductKey(candidate);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, candidate);
      continue;
    }
    const existingIsLocale = /^\/(en|ru)\//i.test(new URL(existing).pathname);
    const currentIsLocale = /^\/(en|ru)\//i.test(new URL(candidate).pathname);
    if (existingIsLocale && !currentIsLocale) {
      deduped.set(key, candidate);
    }
  }

  const pathFilter = categorySlug
    ? EE_CATEGORY_PATH_FILTERS[categorySlug as FasmetriCategorySlug]
    : undefined;

  return [...deduped.values()]
    .filter((url) => {
      if (!pathFilter) return true;
      const pathname = new URL(url).pathname;
      if (!pathFilter.test(pathname)) return false;
      if (categorySlug === "laptops") return EE_LAPTOP_URL_HINT.test(pathname) && !EE_LAPTOP_URL_EXCLUDE.test(pathname);
      return true;
    })
    .sort((left, right) => productId(right) - productId(left));
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

  const pathname = context.url.pathname;
  const outlet = isOutletPath(pathname);
  const breadcrumbs: string[] = [];
  if (outlet) breadcrumbs.push("outlet");

  return {
    externalId: product?.id ? String(product.id) : ldProduct?.sku ? String(ldProduct.sku) : undefined,
    title,
    url: context.url.toString(),
    imageUrl,
    price,
    oldPrice: normalizedOldPrice,
    availability: parseAvailability(nextData, ldProduct),
    brand: parseBrand(ldProduct),
    breadcrumbs,
    categorySlug: categorySlugForSignals([
      product?.parentCategoryName,
      product?.categoryName,
      product?.route,
      outlet ? "outlet" : null,
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
  rateLimitMs: 1000,
  maxProductsPerRun: 36,
  preferProductUrlsForCategory: true,
  listProductUrls,
  parseProductPage,
};
