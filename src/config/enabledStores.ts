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
  // Alta is blocked by Cloudflare — disabled until official feed/API is available
  { key: "alta", name: "Alta", baseUrl: "https://alta.ge", enabled: false, priority: "high", importMode: "disabled", blockReason: "blocked_by_cloudflare", notes: "Blocked by Cloudflare. Needs official partner feed, API, manual CSV import, or later adapter." },
  { key: "ee",           name: "Elite Electronics", baseUrl: "https://ee.ge",         enabled: true,  priority: "high"   },
  { key: "pcshop",       name: "PCShop",         baseUrl: "https://pcshop.ge",        enabled: true,  priority: "high"   },
  // Medium-priority stores — enabled
  { key: "extra",        name: "Extra",          baseUrl: "https://extra.ge",         enabled: true,  priority: "medium" },
  { key: "veli",         name: "Veli",           baseUrl: "https://veli.store",       enabled: true,  priority: "medium" },
  // Medium-priority stores — disabled until adapter is configured
  { key: "gorgia",       name: "Gorgia",         baseUrl: "https://gorgia.ge",        enabled: false, priority: "medium" },
  { key: "domino",       name: "Domino",         baseUrl: "https://domino.com.ge",    enabled: false, priority: "medium" },
  { key: "kontakt",      name: "Kontakt",        baseUrl: "https://kontakt.ge",       enabled: true,  priority: "medium", notes: "New JSON-LD/sitemap adapter — validate with import-store --dry-run on the GE runner before first promote." },
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
