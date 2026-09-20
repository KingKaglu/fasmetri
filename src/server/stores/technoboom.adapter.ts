import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// TechnoBoom is API-synced, not HTML-scraped: the storefront is a client-rendered
// Next.js app with no sitemap and no product markup in the served HTML, so every
// parse hook below stays undefined on purpose. Discovery and ingestion live in
// src/server/technoboom/sync.ts, which reads the store's public JSON API
// (Items/web-items-short + Items/web/{id}).
//
// Coverage URLs point at the storefront's taxonomy route
// (/maincategory={id}/category={id}) so the admin coverage report links
// somewhere a human can check, and the ids match the sync's category map.
const API = "ready" as const;
const NOTE = "Ingested from the TechnoBoom JSON API (technoboom-sync), not by HTML scraping";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Public Fasmetri categories ────────────────────────────────────────
  televisions: { url: "/maincategory=2/category=25", status: API, notes: `47 TVs (LED/OLED/QLED); ${NOTE}` },
  // ── Internal classifier buckets — ingested, not shown publicly ────────
  refrigerators: { url: "/maincategory=4/category=21", status: API, notes: NOTE },
  "washing-machines": { url: "/maincategory=4/category=27", status: API, notes: `Washing machines + tumble dryers; ${NOTE}` },
  "home-appliances": { url: "/maincategory=4", status: API, notes: `Stoves, hobs, hoods, dishwashers, vacuums, AC, heating; ${NOTE}` },
  "small-appliances": { url: "/maincategory=5/category=9", status: API, notes: `Kitchen appliances, microwaves, ovens; ${NOTE}` },
  beauty: { url: "/maincategory=5/category=20", status: API, notes: `Personal-care appliances; ${NOTE}` },
  monitors: { url: "/maincategory=3/category=17", status: API, notes: NOTE },
  computers: { url: "/maincategory=3/category=16", status: API, notes: NOTE },
  "computer-accessories": { url: "/maincategory=3/category=19", status: API, notes: NOTE },
  "home-garden": { url: "/maincategory=7/category=37", status: API, notes: `Lamps; ${NOTE}` },
  tech: { url: "/maincategory=2/category=23", status: API, notes: `TV mounts; ${NOTE}` },
  // ── Not carried by TechnoBoom ─────────────────────────────────────────
  mobiles: { url: null, status: "unsupported", notes: "TechnoBoom does not sell phones." },
  laptops: { url: null, status: "unsupported", notes: "TechnoBoom does not sell laptops." },
  gaming: { url: null, status: "unsupported", notes: "TechnoBoom does not sell consoles." },
  audio: { url: null, status: "unsupported", notes: "No standalone audio products in the catalogue." },
  wearables: { url: null, status: "unsupported" },
  tablets: { url: null, status: "unsupported" },
  "tablet-accessories": { url: null, status: "unsupported" },
  "phone-accessories": { url: null, status: "unsupported" },
  "cables-adapters": { url: null, status: "unsupported" },
  "photo-video": { url: null, status: "unsupported" },
  "kitchen-dishes": { url: null, status: "unsupported" },
  furniture: { url: null, status: "unsupported" },
  sport: { url: null, status: "unsupported" },
  kids: { url: null, status: "unsupported" },
  pets: { url: null, status: "unsupported" },
  "books-stationery": { url: null, status: "unsupported" },
  "auto-accessories": { url: null, status: "unsupported" },
  clothing: { url: null, status: "unsupported" },
  tools: { url: null, status: "unsupported" },
  other: { url: null, status: "unsupported" },
  adult: { url: null, status: "unsupported" },
};

export const technoboomStoreAdapter: StoreAdapter = {
  key: "technoboom",
  name: "TechnoBoom",
  baseUrl: "https://www.technoboom.ge",
  status: "ready",
  rateLimitMs: 1000,
  rateLimitConfig: { requestsPerMinute: 60, delayMs: 1000 },
  categoryUrls: readyCategoryUrls(CATEGORIES),
  categories: CATEGORIES,
  getStoreCategories: () => coverageEntries(CATEGORIES),
  getCategoryUrl: (slug) => CATEGORIES[slug as FasmetriCategorySlug]?.url ?? null,
  // The storefront's search is client-side against the same API, so there is no
  // linkable search URL to hand the admin tools.
  getSearchUrl: () => null,
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseCategoryPage: undefined,
  parseProductCard: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
