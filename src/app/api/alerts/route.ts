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

  const select = { id: true, productId: true, targetPrice: true, createdAt: true } as const;

  // Dedup: an active alert for the same email + product is updated in place
  // (re-arms the target price) rather than creating an email-bombing duplicate.
  const existing = await prisma.userPriceAlert.findFirst({
    where: { email: parsed.data.email, productId: product.id, status: "ACTIVE" },
    select: { id: true },
  });

  if (!existing) {
    // Per-email cap: prevent unbounded rows / email bombing across many products.
    const activeCount = await prisma.userPriceAlert.count({
      where: { email: parsed.data.email, status: "ACTIVE" },
    });
    if (activeCount >= 50) {
      return Response.json({ error: "Alert limit reached for this email." }, { status: 429 });
    }
  }

  const alert = existing
    ? await prisma.userPriceAlert.update({
        where: { id: existing.id },
        data: { targetPrice: parsed.data.targetPrice },
        select,
      })
    : await prisma.userPriceAlert.create({
        data: {
          email: parsed.data.email,
          productId: product.id,
          targetPrice: parsed.data.targetPrice,
        },
        select,
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
