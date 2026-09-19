import { getPriceIndex } from "@/lib/priceIndex";

// The /price-index page renders getPriceIndex() server-side; the mobile app
// needs the same numbers over HTTP. PriceIndex is already JSON-safe
// (generatedAt is an ISO string), so there is nothing to serialise by hand.
// Cache window matches the 30-minute recompute inside priceIndex.ts.
export async function GET() {
  const index = await getPriceIndex();
  return Response.json(index, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
