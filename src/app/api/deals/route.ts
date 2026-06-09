import { NextRequest } from "next/server";
import { listPublicProducts } from "@/lib/catalog";
import { filterCuratedProducts } from "@/config/productCuration";
import { cleanSlugParam, finiteNumberParam, pageNumberParam, pageSizeParam } from "@/lib/publicQueryParams";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = {
    dealsOnly: true,
    category: cleanSlugParam(params.get("category")),
    shop: cleanSlugParam(params.get("shop")),
    minPrice: finiteNumberParam(params.get("minPrice")),
    maxPrice: finiteNumberParam(params.get("maxPrice")),
    minDiscount: finiteNumberParam(params.get("minDiscount"), 100),
    availability: cleanSlugParam(params.get("availability")),
    sort: cleanSlugParam(params.get("sort")) ?? "deal-priority",
    popularOnly: params.get("popularOnly") === "true",
    inStockOnly: params.get("inStockOnly") === "true",
    techOnly: params.get("techOnly") === "true",
    largeDiscountOnly: params.get("largeDiscountOnly") === "true",
    page: pageNumberParam(params.get("page")),
    pageSize: pageSizeParam(params.get("pageSize")),
  };
  const products = filterCuratedProducts(await listPublicProducts(filters), filters);
  return Response.json({ products });
}
