import { isAdminRequest } from "@/lib/admin-auth";
import { unlinkOffer } from "@/lib/admin-matching";
import { prisma } from "@/lib/prisma";
import { revalidatePublicCatalog } from "@/lib/revalidate";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const { id } = await context.params;

  try {
    const result = await unlinkOffer(id);
    revalidatePublicCatalog();
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unlink failed.";
    return Response.json({ error: message }, { status: message.includes("not found") ? 404 : 500 });
  }
}
