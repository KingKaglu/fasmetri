import type { StoreAdapter } from "@/server/stores/types";

export const primestoreStoreAdapter: StoreAdapter = {
  key: "primestore",
  name: "PrimeStore",
  baseUrl: "https://primestore.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
