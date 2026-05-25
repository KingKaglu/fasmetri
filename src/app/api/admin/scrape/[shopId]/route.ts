import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { scrapeShop } from "@/server/scrapers/runner";

export async function POST(_: Request, context: { params: Promise<{ shopId: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const { shopId } = await context.params;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return Response.json({ error: "Shop not found." }, { status: 404 });

  try {
    return Response.json({ run: await scrapeShop(shop.slug) }, { status: 202 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Scrape failed." }, { status: 500 });
  }
}
