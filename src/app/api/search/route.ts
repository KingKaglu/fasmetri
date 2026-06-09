import { NextRequest } from "next/server";
import { listPublicProducts } from "@/lib/catalog";
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
  return Response.json({ q: q ?? "", products });
}
