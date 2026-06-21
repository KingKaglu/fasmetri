import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { approvePossibleMatch, rejectPossibleMatch } from "@/lib/admin-matching";
import { prisma } from "@/lib/prisma";
import { revalidatePublicCatalog } from "@/lib/revalidate";

const input = z.object({ action: z.enum(["approve", "reject"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid review action." }, { status: 400 });
  const { id } = await context.params;

  try {
    const result = parsed.data.action === "approve" ? await approvePossibleMatch(id) : await rejectPossibleMatch(id);
    revalidatePublicCatalog();
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review action failed.";
    return Response.json({ error: message }, { status: message.includes("not found") ? 404 : 500 });
  }
}
