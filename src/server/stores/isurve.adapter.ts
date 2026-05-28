import type { StoreAdapter } from "@/server/stores/types";

export const isurveStoreAdapter: StoreAdapter = {
  key: "isurve",
  name: "iSurve",
  baseUrl: "https://isurve.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
