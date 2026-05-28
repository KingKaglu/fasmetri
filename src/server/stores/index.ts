import { STORE_CONFIGS, findStoreConfig, type StoreConfig } from "@/config/enabledStores";
import type { AdapterStatus, StoreAdapter } from "@/server/stores/types";

import { zoommerStoreAdapter } from "./zoommer.adapter";
import { altaStoreAdapter } from "./alta.adapter";
import { eeStoreAdapter } from "./ee.adapter";
import { pcshopStoreAdapter } from "./pcshop.adapter";
import { extraStoreAdapter } from "./extra.adapter";
import { veliStoreAdapter } from "./veli.adapter";
import { gorgiaStoreAdapter } from "./gorgia.adapter";
import { dominoStoreAdapter } from "./domino.adapter";
import { kontaktStoreAdapter } from "./kontakt.adapter";
import { primestoreStoreAdapter } from "./primestore.adapter";
import { kaloStoreAdapter } from "./kalo.adapter";
import { isurveStoreAdapter } from "./isurve.adapter";
import { citrusStoreAdapter } from "./citrus.adapter";
import { gamingLaptopsStoreAdapter } from "./gaming-laptops.adapter";

const ADAPTER_REGISTRY: Record<string, StoreAdapter> = {
  zoommer:       zoommerStoreAdapter,
  alta:          altaStoreAdapter,
  ee:            eeStoreAdapter,
  pcshop:        pcshopStoreAdapter,
  extra:         extraStoreAdapter,
  veli:          veliStoreAdapter,
  gorgia:        gorgiaStoreAdapter,
  domino:        dominoStoreAdapter,
  kontakt:       kontaktStoreAdapter,
  primestore:    primestoreStoreAdapter,
  kalo:          kaloStoreAdapter,
  isurve:        isurveStoreAdapter,
  citrus:        citrusStoreAdapter,
  gaming_laptops: gamingLaptopsStoreAdapter,
};

export function findStoreAdapter(key: string): StoreAdapter | undefined {
  return ADAPTER_REGISTRY[key];
}

export function getAdapterStatus(key: string): AdapterStatus {
  const config = findStoreConfig(key);
  if (!config || !config.enabled) return "disabled";
  const adapter = ADAPTER_REGISTRY[key];
  if (!adapter) return "needs_configuration";
  return adapter.status;
}

export function getEnabledAdapters(): StoreAdapter[] {
  return STORE_CONFIGS
    .filter((store) => store.enabled)
    .flatMap((store) => {
      const adapter = ADAPTER_REGISTRY[store.key];
      return adapter ? [adapter] : [];
    });
}

export type StoreCoverageEntry = {
  config: StoreConfig;
  adapter: StoreAdapter | undefined;
  status: AdapterStatus;
};

export function getStoreCoverageReport(): StoreCoverageEntry[] {
  return STORE_CONFIGS.map((config) => ({
    config,
    adapter: ADAPTER_REGISTRY[config.key],
    status: getAdapterStatus(config.key),
  }));
}
