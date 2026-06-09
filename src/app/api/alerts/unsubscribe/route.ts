import { AlertStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const unsubscribeInput = z.object({
  alertId: z.string().trim().min(1).max(120),
  email: z.string().trim().min(3).max(254).email().transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  const parsed = unsubscribeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid unsubscribe payload." }, { status: 400 });
  if (!prisma) return Response.json({ accepted: true, mode: "fixture" }, { status: 202 });

  const result = await prisma.userPriceAlert.updateMany({
    where: {
      id: parsed.data.alertId,
      email: parsed.data.email,
      status: AlertStatus.ACTIVE,
    },
    data: { status: AlertStatus.PAUSED },
  });

  if (result.count === 0) {
    return Response.json({ error: "Active alert not found." }, { status: 404 });
  }

  return Response.json({ unsubscribed: true });
}
