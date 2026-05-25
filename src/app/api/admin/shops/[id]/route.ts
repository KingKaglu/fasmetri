import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const update = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  baseUrl: z.string().trim().url().optional(),
  reliabilityLabel: z.string().trim().max(120).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = update.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid shop update." }, { status: 400 });
  const { id } = await context.params;
  return Response.json({ shop: await prisma.shop.update({ where: { id }, data: parsed.data }) });
}
