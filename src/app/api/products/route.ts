import { NextRequest } from "next/server";
import { listPublicProducts } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = params.get("page");
  const pageSize = params.get("pageSize");
  const products = await listPublicProducts({
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    shop: params.get("shop") ?? undefined,
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
    minDiscount: params.get("minDiscount") ? Number(params.get("minDiscount")) : undefined,
    availability: params.get("availability") ?? undefined,
    dealsOnly: params.get("dealsOnly") === "true",
    sort: params.get("sort") ?? undefined,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  });
  return Response.json({ products });
}
