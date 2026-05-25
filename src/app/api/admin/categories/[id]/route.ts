import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const categoryUpdate = z.object({
  nameKa: z.string().trim().min(2),
  nameEn: z.string().trim().nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = categoryUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid category update." }, { status: 400 });
  return Response.json({ category: await prisma.category.update({ where: { id: (await context.params).id }, data: parsed.data }) });
}
