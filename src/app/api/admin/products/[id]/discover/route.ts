import { isAdminRequest } from "@/lib/admin-auth";
import { discoverOffersForProduct } from "@/lib/offerDiscovery";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  try {
    return Response.json({ result: await discoverOffersForProduct((await context.params).id) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Offer discovery failed." }, { status: 400 });
  }
}
