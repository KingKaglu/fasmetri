const LOC_TAG_PATTERN = /<loc>\s*([^<]+?)\s*<\/loc>/gi;

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

export function extractLocs(xml: string) {
  const results = [...xml.matchAll(LOC_TAG_PATTERN)]
    .map((match) => decodeXmlEntities(match[1].trim()))
    .filter(Boolean);
  return [...new Set(results)];
}

export async function fetchSitemapLocs(sitemapUrl: string, userAgent: string) {
  const response = await fetch(sitemapUrl, {
    headers: { "user-agent": userAgent },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed sitemap fetch ${response.status} ${response.statusText}`);
  }
  return extractLocs(await response.text());
}

export async function loadProductUrlsFromIndexes(
  indexUrls: string[],
  options: { includeSitemap: RegExp; includeProductUrl?: RegExp; userAgent: string },
) {
  const sitemapUrls = new Set<string>();
  for (const indexUrl of indexUrls) {
    const locs = await fetchSitemapLocs(indexUrl, options.userAgent);
    for (const loc of locs) {
      if (options.includeSitemap.test(loc)) sitemapUrls.add(loc);
    }
  }

  const productUrls = new Set<string>();
  for (const sitemapUrl of sitemapUrls) {
    const locs = await fetchSitemapLocs(sitemapUrl, options.userAgent);
    for (const loc of locs) {
      if (!options.includeProductUrl || options.includeProductUrl.test(loc)) {
        productUrls.add(loc);
      }
    }
  }

  return [...productUrls];
}
