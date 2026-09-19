import { NextRequest, after } from "next/server";
import { listPublicProducts } from "@/lib/catalog";
import { recordSearch } from "@/lib/search-log";
import { publicApiProduct } from "@/lib/publicApiView";
import { isExcludedPublicQuery } from "@/config/productCuration";
import { cleanSearchQuery, cleanSlugParam, finiteNumberParam, pageNumberParam, pageSizeParam } from "@/lib/publicQueryParams";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawQuery = cleanSearchQuery(params.get("q"));
  const q = isExcludedPublicQuery(rawQuery) ? undefined : rawQuery;
  const products = await listPublicProducts({
    q,
    category: cleanSlugParam(params.get("category")),
    shop: cleanSlugParam(params.get("shop")),
    minPrice: finiteNumberParam(params.get("minPrice")),
    maxPrice: finiteNumberParam(params.get("maxPrice")),
    minDiscount: finiteNumberParam(params.get("minDiscount"), 100),
    availability: cleanSlugParam(params.get("availability")),
    dealsOnly: params.get("dealsOnly") === "true",
    sort: cleanSlugParam(params.get("sort")),
    page: pageNumberParam(params.get("page")),
    pageSize: pageSizeParam(params.get("pageSize")),
  });
  // Note: this response is CDN-cached for 5 minutes, so repeat queries never
  // reach the origin and are not logged. The /search page is the complete
  // record; these rows only add API consumers on top.
  if (q) {
    const category = cleanSlugParam(params.get("category"));
    const shop = cleanSlugParam(params.get("shop"));
    const page = pageNumberParam(params.get("page"));
    after(() =>
      recordSearch({
        query: q,
        resultsCount: products.length,
        category,
        shop,
        page,
        headers: request.headers,
      }),
    );
  }

  return Response.json(
    { q: q ?? "", products: products.map(publicApiProduct) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
