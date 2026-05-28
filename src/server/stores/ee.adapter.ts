import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// EE uses sitemap-based product discovery (ee.ge/sitemap.xml → /sitemap/products/*.xml).
// 49 product sitemaps mapped to Fasmetri categories; see src/server/scrapers/shops/ee.ts.
// Category listing URLs below are used for display only (store coverage report).
// Real imports use sitemap discovery via listProductUrls(categorySlug).
const SM = "ready" as const;
const SN = "Sitemap-based; sitemaps mapped in ee.ts scraper adapter";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Tech & Mobile ─────────────────────────────────────────────────
  mobiles:                { url: "/mobilurebi-da-chkviani-teqnika", status: SM, notes: "c29 (1363) + c320 (171) sitemaps" },
  "phone-accessories":    { url: "/mobilurebi-da-chkviani-teqnika", status: SM, notes: "c82 (1834) + c3 (162) sitemaps" },
  tablets:                { url: null, status: "needs_configuration", notes: "Part of mobile-and-smart-tech; add category URL" },
  "tablet-accessories":   { url: null, status: "needs_configuration", notes: "Part of mobile-and-smart-tech; add category URL" },
  laptops:                { url: "/kompiuterebi-da-geimingi", status: SM, notes: "c27 (1426) sitemap — overlaps computers" },
  computers:              { url: "/kompiuterebi-da-geimingi", status: SM, notes: "c27 + it-products-c322 (12) sitemaps" },
  "computer-accessories": { url: "/kompiuterebi-da-geimingi", status: SM, notes: "c92 (886) + c79 (166) sitemaps" },
  "cables-adapters":      { url: "/kompiuterebi-da-geimingi", status: SM, notes: "c79 (166) + c3 (162) sitemaps" },
  monitors:               { url: "/kompiuterebi-da-geimingi", status: SM, notes: "c23 (20) sitemap" },
  // ── Entertainment ─────────────────────────────────────────────────
  televisions:            { url: "/televizorebi-da-audio-motsyobilobebi", status: SM, notes: "c31 (200) + c327 (2) sitemaps" },
  audio:                  { url: "/televizorebi-da-audio-motsyobilobebi", status: SM, notes: "c15 (100) + c326 (462) sitemaps" },
  wearables:              { url: "/mobilurebi-da-chkviani-teqnika", status: SM, notes: "c334 (6) + c82 subset sitemaps" },
  gaming:                 { url: "/kompiuterebi-da-geimingi", status: SM, notes: "c87/gartoba (30) + c323 (2) sitemaps" },
  "photo-video":          { url: "/foto-video-da-gartoba", status: SM, notes: "c81+c28+c328+c331 sitemaps (222 total)" },
  // ── Home Appliances ───────────────────────────────────────────────
  refrigerators:          { url: "/sayofackhovrebo-teqnika", status: SM, notes: "c25 (1254) sitemap" },
  "washing-machines":     { url: "/sayofackhovrebo-teqnika", status: SM, notes: "c16 (951) + c17 (6) sitemaps" },
  "home-appliances":      { url: "/sayofackhovrebo-teqnika", status: SM, notes: "c16 + c293 + c294 + c84 sitemaps" },
  "small-appliances":     { url: "/tsvrili-sayofackhovrebo-teqnika", status: SM, notes: "c30+c90+c83+c333 sitemaps" },
  "kitchen-dishes":       { url: null, status: "needs_configuration", notes: "Possible c310/kitchen-accessories; verify" },
  // ── Lifestyle ─────────────────────────────────────────────────────
  beauty:                 { url: "/tavis-movla", status: SM, notes: "personal-care-c311 (224) sitemap" },
  "auto-accessories":     { url: null, status: "needs_configuration", notes: "Not found in sitemap index; verify on ee.ge" },
  sport:                  { url: null, status: "needs_configuration", notes: "Not found in sitemap index" },
  kids:                   { url: null, status: "needs_configuration", notes: "child-care-c387 sitemap (0 products currently)" },
  pets:                   { url: null, status: "unsupported" },
  // ── Unsupported ───────────────────────────────────────────────────
  furniture:              { url: null, status: "unsupported", notes: "furniture-c26, outdoor-furniture-c307 sitemaps exist but not in scope" },
  "home-garden":          { url: null, status: "unsupported" },
  "books-stationery":     { url: null, status: "unsupported" },
  other:                  { url: null, status: SM, notes: "gartoba-c88 (106) + smart-home-c321 (2) sitemaps" },
  adult:                  { url: null, status: "unsupported" },
};

export const eeStoreAdapter: StoreAdapter = {
  key: "ee",
  name: "Elite Electronics",
  baseUrl: "https://ee.ge",
  status: "ready",
  rateLimitMs: 5000,
  rateLimitConfig: { requestsPerMinute: 12, delayMs: 5000 },
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
