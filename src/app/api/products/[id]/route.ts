import { getPublicProduct } from "@/lib/catalog";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await getPublicProduct(id);
  return product ? Response.json({ product }) : Response.json({ error: "Product not found." }, { status: 404 });
}
