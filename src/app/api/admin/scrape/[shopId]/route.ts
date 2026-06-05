import { isAdminRequest } from "@/lib/admin-auth";

export async function POST(_: Request, context: { params: Promise<{ shopId: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  const { shopId } = await context.params;
  return Response.json(
    {
      error: "Generic admin scraping is disabled.",
      shopId,
      replacement: "Use npm run sync:zoommer:laptops or the /api/sync/zoommer-laptops cron endpoint.",
    },
    { status: 410 },
  );
}
