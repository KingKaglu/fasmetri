import { z } from "zod";
import { prisma } from "@/lib/prisma";

const alertInput = z.object({
  email: z.string().trim().min(3).max(254).email().transform((value) => value.toLowerCase()),
  productId: z.string().trim().min(1).max(120),
  targetPrice: z.coerce.number().positive().max(1_000_000),
});

export async function POST(request: Request) {
  const parsed = alertInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid alert payload.", issues: parsed.error.issues }, { status: 400 });
  if (!prisma) return Response.json({ accepted: true, mode: "fixture" }, { status: 202 });

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return Response.json({ error: "Product not found." }, { status: 404 });

  const alert = await prisma.userPriceAlert.create({
    data: {
      email: parsed.data.email,
      productId: product.id,
      targetPrice: parsed.data.targetPrice,
    },
    select: {
      id: true,
      productId: true,
      targetPrice: true,
      createdAt: true,
    },
  });
  const unsubscribeUrl = new URL(`/alerts/unsubscribe/${alert.id}`, request.url).toString();
  return Response.json({
    alert: {
      ...alert,
      targetPrice: Number(alert.targetPrice),
      createdAt: alert.createdAt.toISOString(),
      unsubscribeUrl,
    },
  }, { status: 201 });
}
