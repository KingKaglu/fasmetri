import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// Extra uses sitemap-based discovery (extra.ge/sitemaps/sitemaps.xml → product sitemaps).
// Product pages carry JSON-LD. No category listing URLs are currently mapped.
// Category pages are likely at /category/{georgian-slug}/ — verify before enabling targeted imports.
const SN = "Sitemap-based; add category listing URL for targeted import";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Tech & Mobile ─────────────────────────────────────────────────
  mobiles:              { url: null, status: "needs_configuration", notes: SN },
  "phone-accessories":  { url: null, status: "needs_configuration", notes: SN },
  tablets:              { url: null, status: "needs_configuration", notes: SN },
  "tablet-accessories": { url: null, status: "needs_configuration", notes: SN },
  laptops:              { url: null, status: "needs_configuration", notes: SN },
  computers:            { url: null, status: "needs_configuration", notes: SN },
  "computer-accessories": { url: null, status: "needs_configuration", notes: SN },
  "cables-adapters":    { url: null, status: "needs_configuration", notes: SN },
  monitors:             { url: null, status: "needs_configuration", notes: SN },
  // ── Entertainment ─────────────────────────────────────────────────
  televisions:          { url: null, status: "needs_configuration", notes: SN },
  audio:                { url: null, status: "needs_configuration", notes: SN },
  wearables:            { url: null, status: "needs_configuration", notes: SN },
  gaming:               { url: null, status: "needs_configuration", notes: SN },
  "photo-video":        { url: null, status: "needs_configuration", notes: SN },
  // ── Home ──────────────────────────────────────────────────────────
  refrigerators:        { url: null, status: "needs_configuration", notes: SN },
  "washing-machines":   { url: null, status: "needs_configuration", notes: SN },
  "home-appliances":    { url: null, status: "needs_configuration", notes: SN },
  "small-appliances":   { url: null, status: "needs_configuration", notes: SN },
  "kitchen-dishes":     { url: null, status: "needs_configuration", notes: SN },
  furniture:            { url: null, status: "needs_configuration", notes: SN },
  "home-garden":        { url: null, status: "needs_configuration", notes: SN },
  // ── Lifestyle ─────────────────────────────────────────────────────
  beauty:               { url: null, status: "needs_configuration", notes: SN },
  sport:                { url: null, status: "needs_configuration", notes: SN },
  kids:                 { url: null, status: "needs_configuration", notes: SN },
  pets:                 { url: null, status: "needs_configuration", notes: SN },
  "auto-accessories":   { url: null, status: "needs_configuration", notes: SN },
  "books-stationery":   { url: null, status: "needs_configuration", notes: SN },
  // ── Unlikely / unsupported ────────────────────────────────────────
  other:                { url: null, status: "unsupported" },
  adult:                { url: null, status: "unsupported" },
};

export const extraStoreAdapter: StoreAdapter = {
  key: "extra",
  name: "Extra",
  baseUrl: "https://extra.ge",
  status: "ready",
  rateLimitMs: 3500,
  rateLimitConfig: { requestsPerMinute: 17, delayMs: 3500 },
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
