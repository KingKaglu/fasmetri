import { NextRequest } from "next/server";
import { listPublicProducts } from "@/lib/catalog";
import { filterCuratedProducts } from "@/config/productCuration";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = params.get("page");
  const pageSize = params.get("pageSize");
  const filters = {
    dealsOnly: true,
    category: params.get("category") ?? undefined,
    shop: params.get("shop") ?? undefined,
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
    minDiscount: params.get("minDiscount") ? Number(params.get("minDiscount")) : undefined,
    availability: params.get("availability") ?? undefined,
    sort: params.get("sort") ?? "deal-priority",
    popularOnly: params.get("popularOnly") === "true",
    inStockOnly: params.get("inStockOnly") === "true",
    techOnly: params.get("techOnly") === "true",
    largeDiscountOnly: params.get("largeDiscountOnly") === "true",
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  };
  const products = filterCuratedProducts(await listPublicProducts(filters), filters);
  return Response.json({ products });
}
