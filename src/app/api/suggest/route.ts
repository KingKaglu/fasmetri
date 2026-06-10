import { NextRequest, NextResponse } from "next/server";
import { listPublicCategories, listPublicProducts } from "@/lib/catalog";
import { normalizeSearchText } from "@/lib/searchKeywords";

export const runtime = "nodejs";

const MAX_SUGGESTIONS = 6;
const MAX_BRANDS = 3;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ suggestions: [], brands: [], categories: [] });
  }

  const [products, publicCategories] = await Promise.all([
    listPublicProducts({ q, page: 1, pageSize: MAX_SUGGESTIONS * 3 }),
    listPublicCategories(),
  ]);

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

  // Brand suggestions: distinct brands of the matched products, most frequent first.
  const brandCounts = new Map<string, { brand: string; count: number }>();
  for (const product of products) {
    const brand = product.brand?.trim();
    if (!brand) continue;
    const key = brand.toLowerCase();
    const entry = brandCounts.get(key) ?? { brand, count: 0 };
    entry.count += 1;
    brandCounts.set(key, entry);
  }
  const brands = [...brandCounts.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, MAX_BRANDS)
    .map((entry) => ({ name: entry.brand, productCount: entry.count }));

  // Category suggestions: public categories whose name matches the query, or
  // that the matched products belong to.
  const normalizedQuery = normalizeSearchText(q);
  const matchedCategorySlugs = new Set(products.map((product) => product.category?.slug).filter(Boolean));
  const categories = publicCategories
    .filter((category) => {
      if (matchedCategorySlugs.has(category.slug)) return true;
      const names = [category.nameKa, category.nameEn ?? "", category.slug].map((name) => normalizeSearchText(name));
      return normalizedQuery.length >= 3 && names.some((name) => name.includes(normalizedQuery) || normalizedQuery.includes(name));
    })
    .slice(0, 2)
    .map((category) => ({
      slug: category.slug,
      nameKa: category.nameKa,
      productCount: category.productCount ?? 0,
    }));

  return NextResponse.json(
    { suggestions, brands, categories },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
