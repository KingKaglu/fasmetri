import { ShopAdapter } from "@/server/scrapers/types";

export function placeholderAdapter(slug: string, name: string, baseUrl: string): ShopAdapter {
  return {
    slug,
    name,
    baseUrl,
    enabledByDefault: false,
    needsConfiguration: true,
    rateLimitMs: 5000,
    categoryUrls: {},
    parseDocument: () => [],
  };
}
