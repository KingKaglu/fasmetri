import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import { coverageEntries, readyCategoryUrls } from "@/server/stores/adapter-utils";
import type { CategoryCoverage, StoreAdapter } from "@/server/stores/types";

// iSurve is ingested from the standard public Shopify JSON endpoints — see
// src/server/isurve/sync.ts. This StoreAdapter only backs the admin coverage
// screens; it does no parsing.
//
// iSurve has ~1,330 Shopify collections and most of them are brand hubs, price
// bands or installment funnels. The sync walks only the ~318 whose own Georgian
// title resolves to a public Fasmetri category; the handles below are the
// representative shelf for each category, read off --mode=discover on
// 2026-09-23 (the number after each is that run's product count for the whole
// category, not for the single handle shown).
const SM = "ready" as const;
const SN = "Synced from the Shopify collection JSON (scripts/isurve-sync.ts); category resolved from the store's own Georgian collection titles";

const CATEGORIES: Partial<Record<FasmetriCategorySlug, CategoryCoverage>> = {
  "small-appliances":   { url: "/collections/wvrili-teqnika", status: SM, notes: "Largest shelf by far (~9.3k collection memberships). The umbrella collection itself carries no category authority — products in it are classified from their own titles. " + SN },
  "home-appliances":    { url: "/collections/msxvili-teqnika", status: SM, notes: "Also an umbrella shelf, classified per product. Vacuum cleaners, cookers, heaters, air conditioners. " + SN },
  beauty:               { url: "/collections/mamakacis-eleqtro-wversaparsi", status: SM, notes: "Shavers, trimmers, clippers. " + SN },
  "washing-machines":   { url: "/collections/sarecxi-manqana", status: SM, notes: "Includes dishwashers, which the shared classifier files here. " + SN },
  refrigerators:        { url: "/collections/macivrebi", status: SM, notes: SN },
  audio:                { url: "/collections/geimeruli-yursasmeni", status: SM, notes: "Headphones and Bluetooth speakers. " + SN },
  televisions:          { url: "/collections/4k-televizori", status: SM, notes: SN },
  "photo-video":        { url: "/collections/cifruli-teqnika", status: SM, notes: "Dash cams, mini cameras, surveillance cameras. Umbrella shelf, classified per product. " + SN },
  mobiles:              { url: "/collections/samsung-ის-მობილური-ტელეფონები", status: SM, notes: "Thin — iSurve's phone range is small and only reachable through brand-named shelves. " + SN },
  "phone-accessories":  { url: "/collections/დამტენი", status: SM, notes: "Chargers and holders. " + SN },
  "smart-home":         { url: "/collections/ჭკვიანი-სახლი", status: SM, notes: SN },
  // Reached only incidentally, through umbrella shelves — no dedicated
  // collection exists, so there is nothing to point a coverage URL at.
  tablets:              { url: null, status: "unsupported", notes: "No dedicated shelf; a handful arrive via the umbrella collections." },
  "cables-adapters":    { url: null, status: "unsupported", notes: "No dedicated shelf; a handful arrive via the umbrella collections." },
  "computer-accessories": { url: "/collections/ლეპტოპის-ჩანთები", status: SM, notes: "Laptop bags. iSurve sells no laptops, so the bags are accessories, not computing. " + SN },
  // Shelves that exist but are deliberately held out of the sync.
  other:                { url: null, status: "unsupported", notes: "Price-band, installment, outlet and Facebook-feed shelves are excluded in the sync, not just uncategorised. So are mis-scoring shelves whose title collides with a tech keyword — clothes hangers, dish racks, grass trimmers, heat guns, soldering irons, insect repellent, TV tables." },
  laptops:              { url: null, status: "unsupported", notes: "iSurve does not sell laptops; the only matching shelf is laptop bags." },
  computers:            { url: null, status: "unsupported" },
  monitors:             { url: null, status: "unsupported" },
  gaming:               { url: null, status: "unsupported" },
  wearables:            { url: null, status: "unsupported" },
  drones:               { url: null, status: "unsupported" },
  "tablet-accessories": { url: null, status: "unsupported" },
  "tv-mounts":          { url: null, status: "unsupported", notes: "The only shelf that scored here was a clothes hanger; excluded." },
  // Real iSurve ranges that sit outside the public catalogue scope entirely.
  "home-garden":        { url: null, status: "unsupported", notes: "Pools, garden furniture, pavilions — out of public catalogue scope." },
  tools:                { url: null, status: "unsupported", notes: "A large power-tool range — out of public catalogue scope." },
  "auto-accessories":   { url: null, status: "unsupported", notes: "Car chemicals and oils — out of public catalogue scope." },
  "kitchen-dishes":     { url: null, status: "unsupported", notes: "Cookware and bakeware — out of public catalogue scope." },
  kids:                 { url: null, status: "unsupported", notes: "Toys — out of public catalogue scope." },
  furniture:            { url: null, status: "unsupported" },
  clothing:             { url: null, status: "unsupported" },
  "books-stationery":   { url: null, status: "unsupported" },
  pets:                 { url: null, status: "unsupported" },
  sport:                { url: null, status: "unsupported" },
  tech:                 { url: null, status: "unsupported" },
  adult:                { url: null, status: "unsupported" },
};

export const isurveStoreAdapter: StoreAdapter = {
  key: "isurve",
  name: "iSurve",
  baseUrl: "https://isurve.ge",
  // Adapter-side readiness only — this object backs the admin coverage screens
  // and is NOT consulted by the sync. The enabledStores.ts switch (enabled:true
  // since 2026-09-23) is not read anywhere on the ingestion path either:
  // runIsurveSync() creates the Shop row with enabled:true itself.
  // The switch is enforced in scripts/isurve-sync.ts, which refuses --promote
  // while findStoreConfig("isurve").enabled is false.
  status: "ready",
  rateLimitMs: 400,
  rateLimitConfig: { requestsPerMinute: 150, delayMs: 400 },
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
