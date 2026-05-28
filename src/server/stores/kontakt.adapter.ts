import type { StoreAdapter } from "@/server/stores/types";

export const kontaktStoreAdapter: StoreAdapter = {
  key: "kontakt",
  name: "Kontakt",
  baseUrl: "https://kontakt.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
