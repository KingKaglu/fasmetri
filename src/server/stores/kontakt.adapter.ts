import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// Kontakt (Kontakt Home) runs Magento 2 + Swissup Breeze. Product discovery is
// sitemap-based via /media/sitemap/sitemap_ge.xml; the real parsing lives in
// src/server/scrapers/shops/kontakt.ts. Category paths below were read off the
// live sitemap on 2026-09-20 — the store has no BreadcrumbList JSON-LD, so
// these URLs are also the only reliable statement of its taxonomy.
const SM = "ready" as const;
const SN = "Sitemap-based (sitemap_ge.xml); category inferred from title at scrape time — no breadcrumb JSON-LD";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  // ── Verified category paths ───────────────────────────────────────
  mobiles:                { url: "/mobilurebi-da-aksesuarebi/mobiluri-telefonebi", status: SM, notes: SN },
  "phone-accessories":    { url: "/mobilurebi-da-aksesuarebi/mobiluris-aksesuarebi", status: SM, notes: SN },
  audio:                  { url: "/mobilurebi-da-aksesuarebi/qursasmenebi", status: SM, notes: "Headphones; TV speakers live under /televizorebi/dinamikebi. " + SN },
  laptops:                { url: "/kompiuteruli-teknika/leptopebi", status: SM, notes: "Gaming laptops are listed separately under /gaming/gaming-leptopebi. " + SN },
  computers:              { url: "/kompiuteruli-teknika/personaluri-kompiuteri", status: SM, notes: SN },
  monitors:               { url: "/kompiuteruli-teknika/monitorebi", status: SM, notes: "Gaming monitors also under /gaming/gaming-monitorebi. " + SN },
  "computer-accessories": { url: "/kompiuteruli-teknika/kompiuteris-aksesuarebi", status: SM, notes: "Keyboards, mice, coolers, webcams, flash storage. " + SN },
  "cables-adapters":      { url: "/kompiuteruli-teknika/kompiuteris-aksesuarebi/hdmi-kabelebi", status: SM, notes: "Also /gadamqvanebi and /kseluri-aghchurviloba/kselis-kabelebi. " + SN },
  televisions:            { url: "/televizorebi/televizorebi", status: SM, notes: SN },
  "tv-mounts":            { url: "/televizorebi/televizoris-aqsesuarebi", status: SM, notes: SN },
  gaming:                 { url: "/gaming/satamasho-konsolebi", status: SM, notes: "Consoles, joysticks, PS discs; duplicated at /hobi-da-gartoba/satamasho-konsolebi. " + SN },
  tablets:                { url: "/smart-gajetebi/planshetebi", status: SM, notes: SN },
  "tablet-accessories":   { url: "/smart-gajetebi/planshetis-aksesuarebi", status: SM, notes: SN },
  wearables:              { url: "/smart-gajetebi/smart-saatebi", status: SM, notes: SN },
  "photo-video":          { url: "/smart-gajetebi/foto-da-video", status: SM, notes: "Action cameras, photo/video gear. " + SN },
  refrigerators:          { url: "/saqophatskhovrebo-teknika/mskhvili-saqophatskhovrebo-teknika/matsivrebi", status: SM, notes: SN },
  "washing-machines":     { url: "/saqophatskhovrebo-teknika/mskhvili-saqophatskhovrebo-teknika/saretskhi-mankanebi", status: SM, notes: "Dryers at /sashrobi-mankanebi. " + SN },
  "home-appliances":      { url: "/saqophatskhovrebo-teknika/mskhvili-saqophatskhovrebo-teknika", status: SM, notes: "Dishwashers, cookers, hobs, water dispensers. " + SN },
  "small-appliances":     { url: "/saqophatskhovrebo-teknika/tsvrili-saqophatskhovrebo-teknika", status: SM, notes: "Vacuums, robot vacuums. " + SN },
  "kitchen-dishes":       { url: "/samzareulos-teknika/samzareulos-churcheli", status: SM, notes: SN },
  beauty:                 { url: "/silamaze-da-janmrteloba", status: SM, notes: "Hair/skin care, hygiene, health. " + SN },
  "home-garden":          { url: "/sakhli-da-ezo/baghis-inventari", status: SM, notes: SN },
  tools:                  { url: "/sakhli-da-ezo/khelsatsyoebi", status: SM, notes: SN },
  furniture:              { url: "/gaming/gaming-aksesuarebi/gaming-savardzlebi", status: SM, notes: "Only gaming chairs/desks; no general furniture range. " + SN },
  // ── Not carried by Kontakt ────────────────────────────────────────
  "auto-accessories":     { url: null, status: "unsupported" },
  "books-stationery":     { url: null, status: "unsupported" },
  clothing:               { url: null, status: "unsupported" },
  kids:                   { url: null, status: "unsupported" },
  pets:                   { url: null, status: "unsupported" },
  sport:                  { url: null, status: "unsupported" },
  tech:                   { url: null, status: "unsupported" },
  other:                  { url: null, status: "unsupported" },
  adult:                  { url: null, status: "unsupported" },
};

export const kontaktStoreAdapter: StoreAdapter = {
  key: "kontakt",
  name: "Kontakt",
  baseUrl: "https://kontakt.ge",
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
