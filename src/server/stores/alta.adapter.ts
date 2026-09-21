import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// Alta is ingested from its own public JSON API — see src/server/alta/sync.ts.
// This StoreAdapter only backs the admin coverage screens; it does no parsing.
//
// The 18 root categories below were read from /v1/Categories/all-categories
// with Accept-Language: ka-GE on 2026-09-20. Only the roots are listed on
// purpose: a listing request for a parent already returns every descendant, so
// the sync walks roots and the child categories add nothing but duplicate work.
const SM = "ready" as const;
const SN = "Synced via the api.alta.ge listing API (scrape:alta:full); category resolved from the store's own Georgian category names";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  mobiles:              { url: "/mobiluri-telefonebi-da-aqsesuarebi-c1", status: SM, notes: "Phones plus their accessories share this root. " + SN },
  laptops:              { url: "/kompiuteruli-teqnika-da-aqsesuarebi-c2", status: SM, notes: "Root also covers desktops, monitors and PC accessories. " + SN },
  televisions:          { url: "/televizorebi-da-audio-sistemebi-c3", status: SM, notes: "Shared root with audio systems. " + SN },
  gaming:               { url: "/geimingi-c4", status: SM, notes: SN },
  "photo-video":        { url: "/foto-da-video-c5", status: SM, notes: SN },
  "home-appliances":    { url: "/mskhvili-sayofackhovrebo-teqnika-c6", status: SM, notes: "Large appliances: fridges, washers, cookers. " + SN },
  "small-appliances":   { url: "/tsvrili-saojakho-teqnika-c7", status: SM, notes: "Also /yavis-moyvarultatvis-c175 (coffee). " + SN },
  "home-garden":        { url: "/sakhlis-da-ezos-movla-c9", status: SM, notes: SN },
  beauty:               { url: "/tavis-movla-c10", status: SM, notes: SN },
  kids:                 { url: "/mshobeli-da-bavshvi-c12", status: SM, notes: SN },
  "auto-accessories":   { url: "/manqanis-khelsatsyoebi-da-aqsesuarebi-c13", status: SM, notes: SN },
  audio:                { url: "/yursasmenebi-c299", status: SM, notes: "Headphones root; speakers sit under the TV/audio root. " + SN },
  "kitchen-dishes":     { url: "/samzareulos-inventari-c318", status: SM, notes: SN },
  sport:                { url: "/eleqtro-transporti-c213", status: SM, notes: "Scooters and e-transport. " + SN },
  // Roots that exist but are deliberately not mapped to a public category.
  // Alta Outlet is ex-display/returned stock priced below new, so folding it
  // into the normal comparison would undercut every other shop's new price —
  // the same reason EE's /autleti/ path is held out as condition=outlet.
  other:                { url: "/altas-autleti-c301", status: "unsupported", notes: "Alta Outlet — reduced-condition stock, must not be compared as new." },
  // Remaining roots carry no comparable goods.
  refrigerators:        { url: null, status: "unsupported", notes: "Listed under the large-appliance root, not separately." },
  "washing-machines":   { url: null, status: "unsupported", notes: "Listed under the large-appliance root, not separately." },
  monitors:             { url: null, status: "unsupported", notes: "Listed under the computing root, not separately." },
  computers:            { url: null, status: "unsupported", notes: "Listed under the computing root, not separately." },
  "computer-accessories": { url: null, status: "unsupported", notes: "Listed under the computing root, not separately." },
  "cables-adapters":    { url: null, status: "unsupported" },
  tablets:              { url: null, status: "unsupported" },
  "tablet-accessories": { url: null, status: "unsupported" },
  "phone-accessories":  { url: null, status: "unsupported", notes: "Listed under the mobile root, not separately." },
  wearables:            { url: null, status: "unsupported" },
  "tv-mounts":          { url: null, status: "unsupported" },
  furniture:            { url: null, status: "unsupported" },
  "books-stationery":   { url: null, status: "unsupported" },
  clothing:             { url: null, status: "unsupported" },
  pets:                 { url: null, status: "unsupported" },
  tech:                 { url: null, status: "unsupported" },
  tools:                { url: null, status: "unsupported" },
  adult:                { url: null, status: "unsupported" },
};

export const altaStoreAdapter: StoreAdapter = {
  key: "alta",
  name: "Alta",
  baseUrl: "https://alta.ge",
  status: "ready",
  // The API is cheap for Alta to serve, but Cloudflare rate-limits bursts —
  // the sync paces itself at 300ms between calls.
  rateLimitMs: 300,
  rateLimitConfig: { requestsPerMinute: 120, delayMs: 300 },
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
