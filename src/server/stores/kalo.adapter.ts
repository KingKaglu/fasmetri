import type { StoreAdapter } from "@/server/stores/types";

export const kaloStoreAdapter: StoreAdapter = {
  key: "kalo",
  name: "Kalo",
  baseUrl: "https://kalo.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
