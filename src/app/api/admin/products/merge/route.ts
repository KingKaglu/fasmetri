import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const mergeInput = z.object({ sourceId: z.string().min(1), targetId: z.string().min(1) }).refine((data) => data.sourceId !== data.targetId);

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = mergeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose two different products." }, { status: 400 });

  await prisma.$transaction([
    prisma.productOffer.updateMany({ where: { productId: parsed.data.sourceId }, data: { productId: parsed.data.targetId } }),
    prisma.userPriceAlert.updateMany({ where: { productId: parsed.data.sourceId }, data: { productId: parsed.data.targetId } }),
    prisma.product.delete({ where: { id: parsed.data.sourceId } }),
  ]);
  return Response.json({ ok: true });
}
