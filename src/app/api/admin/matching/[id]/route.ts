import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { attachConfirmedOfferToProduct } from "@/lib/crossStoreMatching";
import { prisma } from "@/lib/prisma";

const reviewAction = z.object({ action: z.enum(["confirm", "reject", "lock"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = reviewAction.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid match review action." }, { status: 400 });
  const candidate = await prisma.offerMatchCandidate.findUnique({
    where: { id: (await context.params).id },
    select: { id: true, productId: true, offerId: true, confidence: true },
  });
  if (!candidate) return Response.json({ error: "Match candidate not found." }, { status: 404 });

  if (parsed.data.action === "confirm") {
    await attachConfirmedOfferToProduct(candidate.productId, candidate.offerId);
    await prisma.offerMatchCandidate.update({ where: { id: candidate.id }, data: { status: "CONFIRMED", reviewedAt: new Date() } });
    return Response.json({ status: "CONFIRMED" });
  }

  if (parsed.data.action === "lock") {
    await prisma.$transaction([
      prisma.product.update({ where: { id: candidate.productId }, data: { matchingLocked: true } }),
      prisma.offerMatchCandidate.update({ where: { id: candidate.id }, data: { status: "REJECTED", rejectedAt: new Date(), reviewedAt: new Date() } }),
    ]);
    return Response.json({ status: "LOCKED" });
  }

  await prisma.offerMatchCandidate.update({
    where: { id: candidate.id },
    data: { status: "REJECTED", rejectedAt: new Date(), reviewedAt: new Date() },
  });
  return Response.json({ status: "REJECTED" });
}
