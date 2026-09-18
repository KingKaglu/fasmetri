import { getPublicProduct } from "@/lib/catalog";
import { publicApiProduct } from "@/lib/publicApiView";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await getPublicProduct(id);
  if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
  return Response.json(
    { product: publicApiProduct(product) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
