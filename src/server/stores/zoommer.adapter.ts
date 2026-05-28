import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Tech & Mobile ─────────────────────────────────────────────────
  mobiles:                { url: "/mobiluri-telefonebi-c855", status: "ready" },
  "phone-accessories":    { url: "/mobiluris-aqsesuarebi-c538", status: "ready" },
  tablets:                { url: "/planshetebi-c877", status: "ready" },
  "tablet-accessories":   { url: "/planshetis-aqsesuarebi-c539", status: "ready" },
  laptops:                { url: "/leptopebi-c531", status: "ready" },
  computers:              { url: "/all-in-one-c706", status: "ready", notes: "All-in-one PCs only — no traditional desktops" },
  "computer-accessories": { url: "/leptopis-aqsesuarebi-c700", status: "ready", notes: "Multiple subcategories: laptop accessories, storage, flash drives, IT" },
  "cables-adapters":      { url: "/kabelebi-c1145", status: "ready", notes: "Multiple subcategories: cables, HDMI/LAN" },
  monitors:               { url: "/monitorebi-c503", status: "ready", notes: "Multiple subcategories: monitors, gaming monitors" },
  // ── Entertainment ─────────────────────────────────────────────────
  televisions:            { url: "/televizorebi-c505", status: "ready" },
  audio:                  { url: "/audio-sistema-c528", status: "ready", notes: "Multiple subcategories: audio systems, earphones, buds, acoustic systems" },
  wearables:              { url: "/smart-saatebi-c873", status: "ready", notes: "Multiple subcategories: smartwatches, fitness trackers" },
  gaming:                 { url: "/gaming-c463", status: "ready", notes: "Multiple subcategories: gaming, accessories, PlayStation, Nintendo" },
  "photo-video":          { url: "/foto-da-video-kamerebi-c858", status: "ready", notes: "Multiple subcategories: cameras, action cams, drones, projectors, accessories" },
  // ── Home Appliances ───────────────────────────────────────────────
  refrigerators:          { url: null, status: "unsupported", notes: "Not in Zoommer catalog (not found in 74 sitemaps)" },
  "washing-machines":     { url: null, status: "unsupported", notes: "Not in Zoommer catalog (not found in 74 sitemaps)" },
  "home-appliances":      { url: "/sakhlis-movla-c500", status: "ready", notes: "Multiple subcategories: home care, vacuum cleaners" },
  "small-appliances":     { url: "/tavis-movla-c490", status: "ready", notes: "Multiple subcategories: personal care, kitchen, clothing care" },
  "kitchen-dishes":       { url: null, status: "unsupported" },
  // ── Lifestyle ─────────────────────────────────────────────────────
  "auto-accessories":     { url: "/manqanis-aqsesuarebi-c481", status: "ready" },
  sport:                  { url: "/skuterebi-c461", status: "ready", notes: "Scooters/e-bikes only — limited sport coverage" },
  pets:                   { url: "/shinauri-ckhovelebi-c469", status: "ready" },
  furniture:              { url: "/misaghebi-c501", status: "ready", notes: "Living room furniture — limited selection" },
  kids:                   { url: null, status: "needs_configuration", notes: "No dedicated kids category found in sitemaps" },
  beauty:                 { url: null, status: "unsupported", notes: "Not in Zoommer catalog (not found in 74 sitemaps)" },
  // ── Unsupported ───────────────────────────────────────────────────
  "home-garden":          { url: null, status: "unsupported" },
  "books-stationery":     { url: null, status: "unsupported" },
  other:                  { url: null, status: "unsupported" },
  adult:                  { url: null, status: "unsupported" },
};

export const zoommerStoreAdapter: StoreAdapter = {
  key: "zoommer",
  name: "Zoommer",
  baseUrl: "https://zoommer.ge",
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
