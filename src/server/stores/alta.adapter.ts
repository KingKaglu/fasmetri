import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// Alta public requests currently return a 403 challenge. Category URLs below are
// identified from the live site but scraping is blocked until an approved path is available.
// All categories are therefore needs_configuration, not ready.
const CFG = "needs_configuration" as const;
const NC = "403 on public requests — URL mapped, scraper blocked";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Tech & Mobile ─────────────────────────────────────────────────
  mobiles:              { url: "/mobiluri-telefonebi-c9",         status: CFG, notes: NC },
  laptops:              { url: "/notebooks-c4",                   status: CFG, notes: NC },
  "phone-accessories":  { url: null, status: CFG, notes: "Verify URL on alta.ge; scraper blocked" },
  tablets:              { url: null, status: CFG, notes: "Verify URL on alta.ge; scraper blocked" },
  "tablet-accessories": { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  computers:            { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  "computer-accessories": { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  "cables-adapters":    { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  monitors:             { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  // ── Entertainment ─────────────────────────────────────────────────
  televisions:          { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  audio:                { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  wearables:            { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  gaming:               { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  "photo-video":        { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  // ── Home Appliances ───────────────────────────────────────────────
  refrigerators:        { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  "washing-machines":   { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  "home-appliances":    { url: "/robotic-vacuum-cleaner-c183s", status: CFG, notes: "Too specific — find main appliances URL; scraper blocked" },
  "small-appliances":   { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  // ── Other ─────────────────────────────────────────────────────────
  "auto-accessories":   { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  kids:                 { url: null, status: CFG, notes: "Verify URL on alta.ge" },
  // ── Unsupported ───────────────────────────────────────────────────
  furniture:            { url: null, status: "unsupported" },
  "home-garden":        { url: null, status: "unsupported" },
  "kitchen-dishes":     { url: null, status: "unsupported" },
  beauty:               { url: null, status: "unsupported" },
  sport:                { url: null, status: "unsupported" },
  pets:                 { url: null, status: "unsupported" },
  "books-stationery":   { url: null, status: "unsupported" },
  other:                { url: null, status: "unsupported" },
  adult:                { url: null, status: "unsupported" },
};

export const altaStoreAdapter: StoreAdapter = {
  key: "alta",
  name: "Alta",
  baseUrl: "https://alta.ge",
  status: "needs_configuration",
  rateLimitMs: 2500,
  rateLimitConfig: { requestsPerMinute: 24, delayMs: 2500 },
  // No ready entries — scraping blocked by 403 challenge. URLs tracked in `categories`.
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
