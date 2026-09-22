import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// iSpace (Apple Premium Reseller). Product discovery is sitemap-based via
// /sitemap.xml; the real parsing lives in src/server/scrapers/shops/ispace.ts,
// which resolves category from the JSON-LD BreadcrumbList path slug via a
// dedicated lookup table — the URLs below are read off that same table for
// the admin coverage view, not used by the scraper itself.
const SM = "ready" as const;
const SN = "Sitemap-based (/sitemap.xml); category resolved from the BreadcrumbList path slug in JSON-LD, not this URL.";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  mobiles:                { url: "/category/iphone", status: SM, notes: SN },
  "phone-accessories":    { url: "/category/accessories-for-iphone", status: SM, notes: SN },
  tablets:                { url: "/category/ipad", status: SM, notes: SN },
  "tablet-accessories":   { url: "/category/accessories-for-ipad", status: SM, notes: SN },
  laptops:                { url: "/category/mac", status: SM, notes: "MacBook Air/Pro. " + SN },
  computers:              { url: "/category/imac", status: SM, notes: "iMac, Mac mini, Mac Studio. " + SN },
  "computer-accessories": { url: "/category/accessories-for-mac", status: SM, notes: "Also the Logitech mouse/keyboard hub. " + SN },
  monitors:               { url: "/category/apple-studio-display", status: SM, notes: "Studio Display, Pro Display XDR. " + SN },
  wearables:              { url: "/category/apple-watch", status: SM, notes: SN },
  audio:                  { url: "/category/airpods", status: SM, notes: "Also Bang & Olufsen, Klipsch, Devialet. " + SN },
  televisions:            { url: "/category/apple-tv-4k", status: SM, notes: SN },
  "cables-adapters":      { url: "/category/cables", status: SM, notes: SN },
  gaming:                 { url: "/category/gaming-accessories", status: SM, notes: SN },
  "photo-video":          { url: "/category/dji", status: SM, notes: "DJI gimbals/mics/cameras that are not drones. " + SN },
  drones:                 { url: "/category/dji", status: SM, notes: "Actual DJI drones only — split from photo-video by title, not by this shared category hub. " + SN },
  "smart-home":           { url: "/category/aqara", status: SM, notes: SN },
  tech:                   { url: "/category/airtag", status: SM, notes: "AirTags. " + SN },
  // ── Excluded from ingestion entirely (not physical goods / not new stock) ──
  other:                  { url: null, status: "unsupported", notes: "Services, gift cards, subscriptions, and open-box/\"2nd-life\" stock are excluded in the adapter, not just uncategorised." },
};

export const ispaceStoreAdapter: StoreAdapter = {
  key: "ispace",
  name: "iSpace",
  baseUrl: "https://ispace.ge",
  status: "ready",
  rateLimitMs: 2000,
  rateLimitConfig: { requestsPerMinute: 30, delayMs: 2000 },
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
