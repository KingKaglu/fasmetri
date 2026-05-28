import type { StoreAdapter } from "@/server/stores/types";

export const gamingLaptopsStoreAdapter: StoreAdapter = {
  key: "gaming_laptops",
  name: "Gaming-Laptops",
  baseUrl: "https://gaming-laptops.ge",
  status: "disabled",
  rateLimitMs: 5000,
  categoryUrls: {},
  buildSearchUrl: () => null,
  listProductUrls: undefined,
  parseProductList: undefined,
  parseProductDetail: undefined,
  getNextPageUrl: undefined,
};
