import type { StoreAdapter } from "@/server/stores/types";

export const citrusStoreAdapter: StoreAdapter = {
  key: "citrus",
  name: "Citrus",
  baseUrl: "https://citrus.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
