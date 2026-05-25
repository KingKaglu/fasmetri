import { selectorParser } from "@/server/scrapers/cheerio-parser";
import { ShopAdapter } from "@/server/scrapers/types";

const selectors = {
  // Verify these public catalog selectors before enabling in production.
  item: ".ty-grid-list__item, .product-card",
  title: ".product-title, .ty-grid-list__item-name",
  link: "a.product-title, .ty-grid-list__item-name a",
  image: "img",
  price: ".ty-price-num, .price",
  oldPrice: ".ty-list-price, .old-price",
  availability: ".ty-qty-in-stock, .availability",
};

export const altaAdapter: ShopAdapter = {
  slug: "alta",
  name: "Alta",
  baseUrl: "https://alta.ge",
  enabledByDefault: false,
  // Public requests currently return a challenge/403 in our local runs.
  // Keep the adapter disabled until Alta provides an approved path or selectors can be verified.
  needsConfiguration: true,
  rateLimitMs: 2500,
  categoryUrls: {
    mobiles: ["/mobiluri-telefonebi-c9"],
    computers: ["/notebooks-c4"],
    "home-appliances": ["/robotic-vacuum-cleaner-c183s"],
  },
  selectors,
  parseDocument: selectorParser("https://alta.ge", selectors),
};
