export type StorePriority = "high" | "medium" | "low";
export type StoreImportMode = "enabled" | "disabled";
export type StoreBlockReason = "blocked_by_cloudflare" | "no_adapter" | "manual_only";

export type StoreConfig = {
  key: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  priority: StorePriority;
  importMode?: StoreImportMode;
  blockReason?: StoreBlockReason;
  notes?: string;
};

export const STORE_CONFIGS: StoreConfig[] = [
  // High-priority stores — fully enabled
  { key: "zoommer",      name: "Zoommer",       baseUrl: "https://zoommer.ge",       enabled: true,  priority: "high"   },
  // Alta is synced from its own public JSON API (npm run scrape:alta:full).
  // The old "blocked_by_cloudflare" note was about the HTTP CLIENT, not the IP:
  // Cloudflare fingerprints the TLS handshake, so Node fetch gets 403 where
  // curl gets 200. src/server/alta/sync.ts goes through curl and works.
  { key: "alta", name: "Alta", baseUrl: "https://alta.ge", enabled: true, priority: "high", notes: "Synced from the store's own public JSON API at api.alta.ge (npm run scrape:alta:full) — no HTML scraping. Carries previousPrice and real stock counts. Requires curl (Node fetch is 403'd by Cloudflare) and capitalised request headers." },
  { key: "ee",           name: "Elite Electronics", baseUrl: "https://ee.ge",         enabled: true,  priority: "high"   },
  { key: "pcshop",       name: "PCShop",         baseUrl: "https://pcshop.ge",        enabled: true,  priority: "high"   },
  // Medium-priority stores — enabled
  { key: "technoboom",   name: "TechnoBoom",     baseUrl: "https://www.technoboom.ge", enabled: true, priority: "medium", notes: "Synced from the store's own JSON API (npm run sync:technoboom) — the storefront is client-rendered, so there is no HTML scraper or sitemap." },
  { key: "extra",        name: "Extra",          baseUrl: "https://extra.ge",         enabled: true,  priority: "medium" },
  { key: "veli",         name: "Veli",           baseUrl: "https://veli.store",       enabled: true,  priority: "medium" },
  // Medium-priority stores — disabled until adapter is configured
  { key: "gorgia",       name: "Gorgia",         baseUrl: "https://gorgia.ge",        enabled: false, priority: "medium" },
  { key: "domino",       name: "Domino",         baseUrl: "https://domino.com.ge",    enabled: false, priority: "medium" },
  { key: "kontakt",      name: "Kontakt",        baseUrl: "https://kontakt.ge",       enabled: true,  priority: "medium", notes: "Kontakt Home. Magento 2 (Swissup Breeze); sitemaps live at /media/sitemap/sitemap_ge.xml, not the conventional roots. Products are flat single-segment slugs parsed from JSON-LD Offer; brand hubs emit AggregateOffer in AZN and are rejected. Adapter verified against live pages 2026-09-20 — not yet promoted, run import-store --dry-run first." },
  { key: "ispace",       name: "iSpace",         baseUrl: "https://ispace.ge",        enabled: true,  priority: "high",   notes: "Apple Premium Partner — Georgia's main official Apple reseller; also carries DJI, Logitech, Belkin, Satechi, Aqara, Bang & Olufsen, Klipsch, Devialet, Canyon, Pitaka, Native Union. Nuxt SSR behind Cloudflare, but plain Node fetch gets 200 (not the Alta case — no curl/capitalised-header workaround needed). Single flat /sitemap.xml (~1,149 /product/ URLs after dropping the /en/ locale mirror); parsed from JSON-LD Product + BreadcrumbList, matched by @type not array position. BreadcrumbList slugs (from the item URL, not the display name) are the primary category signal via a 165-entry path map in the adapter — falls through to title-based categorySlugForSignals() for unmapped/marketing-collection breadcrumbs, so nothing is ever dropped for lack of a mapping. sku is the Apple MPN (e.g. MG8G4AF/A) — a far stronger cross-store key than title; carried in externalId and model. Excludes: open-box/\"2nd-life\" stock (SKU/URL \"-od\" suffix — itemCondition in the JSON-LD is unreliable, it says NewCondition even on open-box SKUs) so used units never price-compare against new, and services/gift-cards/subscriptions (not physical goods). Adapter verified against live pages 2026-09-22 — not yet promoted, run import-store --dry-run first." },
  { key: "primestore",   name: "PrimeStore",     baseUrl: "https://primestore.ge",    enabled: false, priority: "medium" },
  { key: "kalo",         name: "Kalo",           baseUrl: "https://kalo.ge",          enabled: false, priority: "medium" },
  // Low-priority stores — disabled until adapter is configured
  { key: "isurve",       name: "iSurve",         baseUrl: "https://isurve.ge",        enabled: false, priority: "low"    },
  { key: "citrus",       name: "Citrus",         baseUrl: "https://citrus.ge",        enabled: false, priority: "low"    },
  { key: "gaming_laptops", name: "Gaming-Laptops", baseUrl: "https://gaming-laptops.ge", enabled: false, priority: "low" },
];

export function getEnabledStores(): StoreConfig[] {
  return STORE_CONFIGS.filter((store) => store.enabled);
}

export function getDisabledStores(): StoreConfig[] {
  return STORE_CONFIGS.filter((store) => !store.enabled);
}

export function findStoreConfig(key: string): StoreConfig | undefined {
  return STORE_CONFIGS.find((store) => store.key === key);
}

export function getStoresByPriority(priority: StorePriority): StoreConfig[] {
  return STORE_CONFIGS.filter((store) => store.priority === priority);
}
