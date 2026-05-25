import { NextRequest } from "next/server";
import { listPublicProducts } from "@/lib/catalog";
import { isExcludedPublicQuery } from "@/config/productCuration";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawQuery = request.nextUrl.searchParams.get("q")?.trim();
  const q = isExcludedPublicQuery(rawQuery) ? undefined : rawQuery;
  const products = await listPublicProducts({
    q,
    category: params.get("category") ?? undefined,
    shop: params.get("shop") ?? undefined,
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
    minDiscount: params.get("minDiscount") ? Number(params.get("minDiscount")) : undefined,
    availability: params.get("availability") ?? undefined,
    dealsOnly: params.get("dealsOnly") === "true",
    sort: params.get("sort") ?? undefined,
    page: params.get("page") ? Number(params.get("page")) : undefined,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : undefined,
  });
  return Response.json({ q: q ?? "", products });
}
