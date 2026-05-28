import type { CheerioAPI } from "cheerio";
import type { ScrapedOffer, ProductPageParseContext } from "@/server/scrapers/types";

export type AdapterStatus = "ready" | "needs_configuration" | "disabled";
export type CategoryStatus = "ready" | "needs_configuration" | "unsupported";

export type CategoryCoverage = {
  url: string | null;
  status: CategoryStatus;
  notes?: string;
};

export type RateLimitConfig = {
  requestsPerMinute: number;
  delayMs: number;
};

export type CategoryCoverageEntry = { slug: string } & CategoryCoverage;

export type StoreAdapter = {
  key: string;
  name: string;
  baseUrl: string;
  status: AdapterStatus;
  rateLimitMs: number;
  rateLimitConfig?: RateLimitConfig;
  categoryUrls: Record<string, string[]>;
  categories?: Partial<Record<string, CategoryCoverage>>;
  getStoreCategories?: () => CategoryCoverageEntry[];
  getCategoryUrl?: (slug: string) => string | null;
  getSearchUrl?: (query: string) => string | null;
  buildSearchUrl: (query: string) => string | null;
  listProductUrls?: (categorySlug?: string) => Promise<string[]>;
  parseCategoryPage?: ($: CheerioAPI, categorySlug: string) => ScrapedOffer[];
  parseProductCard?: ($: CheerioAPI, categorySlug: string) => ScrapedOffer[];
  parseProductList?: ($: CheerioAPI, categorySlug: string) => ScrapedOffer[];
  parseProductDetail?: (context: ProductPageParseContext) => ScrapedOffer | null;
  getNextPageUrl?: (currentUrl: string, page: number) => string | null;
};
