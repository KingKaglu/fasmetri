// Popular searches, taken from what people actually search for.
//
// The search page used to show a hand-written list of terms. Now that
// SearchQuery exists (see reports/search-analytics.md) the same strip can be
// driven by real demand — and it only ever shows terms that RETURNED RESULTS,
// so a popular-search chip can never drop someone onto an empty page.
//
// The hand-written list stays as the fallback: the table starts empty, and a
// brand-new site with no traffic still needs something in that strip.
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isExcludedPublicQuery } from "@/config/productCuration";

const WINDOW_DAYS = 30;
const SAMPLE_LIMIT = 5000;
// Below this a "popular" term is just one person searching twice.
const MIN_OCCURRENCES = 3;

async function loadPopularSearches(): Promise<string[]> {
  if (!prisma) return [];
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.searchQuery.findMany({
      where: { createdAt: { gte: since }, source: "search", hasResults: true },
      select: { query: true, normalized: true },
      orderBy: { createdAt: "desc" },
      take: SAMPLE_LIMIT,
    });

    // Group by the normalized form so spellings collapse, but display the raw
    // query — "iPhone 15" reads better than the normalized token soup.
    const groups = new Map<string, { display: string; count: number }>();
    for (const row of rows) {
      if (isExcludedPublicQuery(row.query)) continue;
      const entry = groups.get(row.normalized);
      if (entry) entry.count += 1;
      else groups.set(row.normalized, { display: row.query, count: 1 });
    }

    return [...groups.values()]
      .filter((entry) => entry.count >= MIN_OCCURRENCES)
      .sort((left, right) => right.count - left.count)
      .map((entry) => entry.display);
  } catch (error) {
    // Table missing (migration not applied yet) or DB hiccup — the caller
    // falls back to the static list rather than rendering an empty strip.
    console.error("[popular-searches] lookup failed:", error);
    return [];
  }
}

const cachedPopularSearches = unstable_cache(loadPopularSearches, ["popular-searches-v1"], {
  revalidate: 3600,
  tags: ["catalog"],
});

/**
 * Top real searches, most frequent first. Returns `fallback` whenever there is
 * not yet enough traffic to be meaningful.
 */
export async function popularSearchTerms(fallback: string[], limit = 6): Promise<string[]> {
  const terms = await cachedPopularSearches();
  return terms.length ? terms.slice(0, limit) : fallback;
}
