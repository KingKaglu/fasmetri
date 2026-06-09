import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// PCShop uses WooCommerce with sitemap-based discovery (/sitemap-post-type-product*.xml).
// All product URLs are under /shop/. Category is inferred from JSON-LD breadcrumbs + title.
// No per-category sitemap slices — listProductUrls(categorySlug) applies path-keyword filters.
const SM = "ready" as const;
const SN = "Sitemap-based; category inferred from JSON-LD breadcrumbs at scrape time";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Core PCShop categories ─────────────────────────────────────────
  computers:              { url: "/product-category/desktops/",           status: SM,     notes: "Mini PCs, desktops, all-in-ones; " + SN },
  laptops:                { url: "/product-category/notebooks/",          status: SM,     notes: SN },
  mobiles:                { url: "/product-category/smartphones-tablets/smartphones/", status: SM, notes: SN },
  "computer-accessories": { url: "/product-category/accessories/",        status: SM,     notes: "RAM, SSD, coolers, peripherals; " + SN },
  "cables-adapters":      { url: "/product-category/cables-adapters/",    status: SM,     notes: SN },
  monitors:               { url: "/product-category/monitors/",           status: SM,     notes: SN },
  gaming:                 { url: "/product-category/gaming/",             status: SM,     notes: "Gaming PCs, chairs, peripherals; " + SN },
  audio:                  { url: "/product-category/audio/",              status: SM,     notes: "Gaming headsets, speakers; " + SN },
  "photo-video":          { url: null,                                    status: SM,     notes: "Webcams, capture cards; " + SN },
  tablets:                { url: "/product-category/tablets/",            status: SM,     notes: SN },
  "tablet-accessories":   { url: null,                                    status: SM,     notes: SN },
  furniture:              { url: "/product-category/furniture/",          status: SM,     notes: "Gaming chairs, desks; " + SN },
  // ── Unlikely / unsupported ────────────────────────────────────────
  "phone-accessories":    { url: null, status: "unsupported" },
  televisions:            { url: null, status: "unsupported" },
  wearables:              { url: null, status: "unsupported" },
  refrigerators:          { url: null, status: "unsupported" },
  "washing-machines":     { url: null, status: "unsupported" },
  "home-appliances":      { url: null, status: "unsupported" },
  "small-appliances":     { url: null, status: "unsupported" },
  "home-garden":          { url: null, status: "unsupported" },
  "kitchen-dishes":       { url: null, status: "unsupported" },
  beauty:                 { url: null, status: "unsupported" },
  sport:                  { url: null, status: "unsupported" },
  kids:                   { url: null, status: "unsupported" },
  pets:                   { url: null, status: "unsupported" },
  "books-stationery":     { url: null, status: "unsupported" },
  "auto-accessories":     { url: null, status: "unsupported" },
  other:                  { url: null, status: "unsupported" },
  adult:                  { url: null, status: "unsupported" },
};

export const pcshopStoreAdapter: StoreAdapter = {
  key: "pcshop",
  name: "PCShop",
  baseUrl: "https://pcshop.ge",
  status: "ready",
  rateLimitMs: 3000,
  rateLimitConfig: { requestsPerMinute: 20, delayMs: 3000 },
  categoryUrls: readyCategoryUrls(CATEGORIES),
  categories: CATEGORIES,
  getStoreCategories: () => coverageEntries(CATEGORIES),
  getCategoryUrl: (slug) => CATEGORIES[slug as FasmetriCategorySlug]?.url ?? null,
  getSearchUrl: () => null,
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseCategoryPage: undefined,
  parseProductCard: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
