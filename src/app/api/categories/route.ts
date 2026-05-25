import { listPublicCategories } from "@/lib/catalog";

export async function GET() {
  return Response.json({ categories: await listPublicCategories() });
}
