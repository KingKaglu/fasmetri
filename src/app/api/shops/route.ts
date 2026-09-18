import { listPublicShops } from "@/lib/catalog";

export async function GET() {
  const shops = (await listPublicShops()).filter((shop) => shop.enabled && (shop.productCount ?? 0) > 0);
  return Response.json({ shops }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
