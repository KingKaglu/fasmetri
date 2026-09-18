import { listPublicCategories } from "@/lib/catalog";

export async function GET() {
  return Response.json(
    { categories: await listPublicCategories() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
