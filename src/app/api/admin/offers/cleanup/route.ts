import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const input = z.object({
  days: z.number().int().min(2).max(60).default(7),
  dryRun: z.boolean().default(true),
});

// Deactivates offers the syncs have not seen for N days. Normal disappearance
// handling (3 missed syncs) already covers most cases — this catches offers
// orphaned by URL churn or a module that stopped running.
export async function POST(request: Request) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid cleanup request." }, { status: 400 });

  const cutoff = new Date(Date.now() - parsed.data.days * 24 * 60 * 60 * 1000);
  const where = { isActive: true, lastSeenAt: { lt: cutoff } };
  const count = await prisma.productOffer.count({ where });
  if (parsed.data.dryRun) return Response.json({ dryRun: true, staleOffers: count });

  const result = await prisma.productOffer.updateMany({
    where,
    data: { isActive: false, availability: "OUT_OF_STOCK", inactiveAt: new Date() },
  });
  return Response.json({ dryRun: false, deactivated: result.count });
}
