import { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

// Every URL below is a dynamic render: /search runs the keyword search, and a
// filtered or sorted listing reads searchParams, so none of them can be served
// from the ISR cache. Crawlers walked them combinatorially (search pages link
// to more searches, listings link to every sort/filter mix) and that is what
// ran the Hobby plan past its Fluid Active CPU allowance on 2026-09-29 and got
// every deployment paused (402 DEPLOYMENT_DISABLED). Filtered views already
// canonicalize to the unfiltered page, so nothing indexable is lost; plain
// `?page=N` pagination stays crawlable.
const CRAWL_TRAPS = [
  "/admin",
  "/api",
  "/search?",
  "/compare",
  "/favorites",
  "/alerts",
  "/*?*q=",
  "/*?*sort=",
  "/*?*shop=",
  "/*?*minPrice=",
  "/*?*maxPrice=",
  "/*?*minDiscount=",
  "/*?*availability=",
  "/*?*dealsOnly=",
  "/*?*inStockOnly=",
];

// SEO-tool and bulk-dataset crawlers: they send no visitors and each one
// re-crawls the whole catalogue on its own schedule. A bot that matches a
// named group ignores the "*" group, so these get a full disallow of their own.
const NO_VALUE_BOTS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "BLEXBot",
  "PetalBot",
  "Bytespider",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: CRAWL_TRAPS },
      { userAgent: NO_VALUE_BOTS, disallow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
