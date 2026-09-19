// "Did you mean" for a zero-result search, built from the catalog instead of a
// spell-checker.
//
// Most failed multi-word searches fail because of ONE over-specific token —
// "iphone 15 pro max 1tb" when the catalog has no 1TB, or a colour/condition
// word the titles never use. Search is AND-semantics (see searchKeywords.ts),
// so dropping a single token is the smallest edit that can turn a dead end
// into results. We only ever offer a relaxed query we have already confirmed
// returns something, so these links can never lead to another empty page.
import { buildSearchPlan } from "@/lib/searchKeywords";
import { listPublicProducts } from "@/lib/catalog";
import { isExcludedPublicQuery } from "@/config/productCuration";

const MAX_SUGGESTIONS = 3;
// Hard cap on catalog probes so a long junk query cannot fan out into a dozen
// queries on a page that is already a miss.
const MAX_PROBES = 4;

export type RelaxedSuggestion = { query: string; productCount: number };

export async function relaxedSearchSuggestions(rawQuery: string): Promise<RelaxedSuggestion[]> {
  try {
    const plan = buildSearchPlan(rawQuery);
    const tokens = plan?.tokens ?? [];
    // Nothing to relax: a single token dropped leaves an empty query.
    if (tokens.length < 2) return [];

    // Drop the last token first — the tail is usually the over-specific part
    // (capacity, colour, generation), the head is usually the brand.
    const candidates: string[] = [];
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const candidate = tokens.filter((_, position) => position !== index).join(" ").trim();
      if (candidate && !candidates.includes(candidate) && !isExcludedPublicQuery(candidate)) candidates.push(candidate);
    }

    const probes = candidates.slice(0, MAX_PROBES);
    const results = await Promise.all(
      probes.map(async (candidate) => {
        try {
          const products = await listPublicProducts({ q: candidate, page: 1, pageSize: 12 });
          return products.length ? { query: candidate, productCount: products.length } : null;
        } catch {
          return null;
        }
      }),
    );

    return results.filter((entry): entry is RelaxedSuggestion => entry !== null).slice(0, MAX_SUGGESTIONS);
  } catch {
    // A failed suggestion pass must not take the search page down with it.
    return [];
  }
}
