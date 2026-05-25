import { CheerioAPI } from "cheerio";

export type ScrapedOffer = {
  externalId?: string;
  title: string;
  url: string;
  imageUrl?: string;
  price: number;
  oldPrice?: number;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  categorySlug?: string;
  description?: string;
  breadcrumbs?: string[];
  imageAlt?: string;
  brand?: string;
  model?: string;
};

export type SelectorConfig = {
  item: string;
  title: string;
  link: string;
  image: string;
  price: string;
  oldPrice?: string;
  availability?: string;
};

export type ProductPageParseContext = {
  $: CheerioAPI;
  html: string;
  url: URL;
};

export type ShopAdapter = {
  slug: string;
  name: string;
  baseUrl: string;
  logoUrl?: string;
  enabledByDefault: boolean;
  needsConfiguration: boolean;
  rateLimitMs: number;
  categoryUrls?: Record<string, string[]>;
  selectors?: SelectorConfig;
  apiEndpoint?: string;
  maxProductsPerRun?: number;
  parseDocument?: ($: CheerioAPI, categorySlug: string) => ScrapedOffer[];
  listProductUrls?: (categorySlug?: string) => Promise<string[]>;
  preferProductUrlsForCategory?: boolean;
  parseProductPage?: (context: ProductPageParseContext) => ScrapedOffer | null;
};
