import { listPublicShops } from "@/lib/catalog";

export async function GET() {
  return Response.json({ shops: await listPublicShops() });
}
