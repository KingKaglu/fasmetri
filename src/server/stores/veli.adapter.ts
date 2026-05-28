import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// Veli is a large marketplace. The scraper adapter is a placeholder — approved API/product
// endpoints still need to be configured before any scraping can occur.
// Category URLs below are unknown and require manual discovery on veli.store.
const SN = "Placeholder adapter — configure approved endpoints before scraping";

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

export const veliStoreAdapter: StoreAdapter = {
  key: "veli",
  name: "Veli",
  baseUrl: "https://veli.store",
  status: "needs_configuration",
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
