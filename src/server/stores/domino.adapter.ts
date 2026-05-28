import type { StoreAdapter } from "@/server/stores/types";

export const dominoStoreAdapter: StoreAdapter = {
  key: "domino",
  name: "Domino",
  baseUrl: "https://domino.com.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
