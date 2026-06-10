import { NextRequest, NextResponse } from "next/server";
import { listPublicProducts } from "@/lib/catalog";

export const runtime = "nodejs";

const MAX_SUGGESTIONS = 8;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ suggestions: [] });
  }

  const products = await listPublicProducts({ q, page: 1, pageSize: MAX_SUGGESTIONS });
  const suggestions = products.slice(0, MAX_SUGGESTIONS).map((product) => {
    const prices = product.offers.map((offer) => offer.currentPrice).filter((price) => price > 0);
    return {
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl ?? product.offers.find((offer) => offer.imageUrl)?.imageUrl ?? null,
      category: product.category?.nameKa ?? product.category?.nameEn ?? null,
      minPrice: prices.length ? Math.min(...prices) : null,
      shopCount: new Set(product.offers.map((offer) => offer.shop.slug)).size,
    };
  });

  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
