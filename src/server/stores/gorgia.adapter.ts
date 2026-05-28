import type { StoreAdapter } from "@/server/stores/types";

export const gorgiaStoreAdapter: StoreAdapter = {
  key: "gorgia",
  name: "Gorgia",
  baseUrl: "https://gorgia.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
