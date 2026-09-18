import { NextRequest } from "next/server";
import { listPublicProducts } from "@/lib/catalog";
import { publicApiProduct } from "@/lib/publicApiView";
import { cleanSearchQuery, cleanSlugParam, finiteNumberParam, pageNumberParam, pageSizeParam } from "@/lib/publicQueryParams";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const products = await listPublicProducts({
    q: cleanSearchQuery(params.get("q")),
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
  return Response.json(
    { products: products.map(publicApiProduct) },
    {
      // The underlying catalogue is memoized for 5-10 minutes anyway, so let the
      // CDN answer repeat calls instead of waking a function for each one.
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    },
  );
}
