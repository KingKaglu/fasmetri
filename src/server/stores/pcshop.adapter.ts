import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// PCShop uses WooCommerce with sitemap-based discovery (/sitemap-post-type-product*.xml).
// All product URLs are under /shop/. Category is inferred from JSON-LD breadcrumbs + title.
// No per-category sitemap slices — listProductUrls(categorySlug) applies path-keyword filters.
const SM = "ready" as const;
const SN = "Sitemap-based; category inferred from JSON-LD breadcrumbs at scrape time";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Core PCShop categories (paths verified against the live
  //    sitemap-taxonomy-product_cat.xml, 2026-07-04) ─────────────────
  computers:              { url: "/product-category/computers/",          status: SM,     notes: "Mini PCs, desktops, all-in-ones; " + SN },
  laptops:                { url: "/product-category/notebooks/",          status: SM,     notes: "Synced via Woo Store API category listing (pcshopCatalog); " + SN },
  mobiles:                { url: "/product-category/smartphones-tablets/smartphones/", status: SM, notes: "Synced via Woo Store API category listing (pcshopCatalog); " + SN },
  "computer-accessories": { url: "/product-category/accessories/",        status: SM,     notes: "RAM, SSD, coolers, peripherals; " + SN },
  "cables-adapters":      { url: "/product-category/connectivity/",       status: SM,     notes: "Cables, adapters, hubs, network gear; " + SN },
  monitors:               { url: "/product-category/monitors-accessories/monitors/", status: SM, notes: SN },
  gaming:                 { url: null,                                    status: SM,     notes: "No single PCShop category; consoles sync uses the Woo Store API playstation search; " + SN },
  audio:                  { url: "/product-category/accessories/headphones/", status: SM, notes: "Headphones, speakers, microphones live under accessories; " + SN },
  "photo-video":          { url: null,                                    status: SM,     notes: "Webcams, capture cards; " + SN },
  tablets:                { url: "/product-category/smartphones-tablets/tablets/", status: SM, notes: SN },
  "tablet-accessories":   { url: null,                                    status: SM,     notes: SN },
  furniture:              { url: "/product-category/accessories/gaming-chairs/", status: SM, notes: "Gaming chairs and desks live under accessories; " + SN },
  // ── Unlikely / unsupported ────────────────────────────────────────
  "phone-accessories":    { url: null, status: "unsupported" },
  televisions:            { url: null, status: "unsupported", notes: "PCShop does list ~54 TVs under /product-category/tv-accessories/tv/ — enable once a sync exists" },
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
