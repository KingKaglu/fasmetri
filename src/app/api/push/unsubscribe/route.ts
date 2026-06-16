import { z } from "zod";
import { prisma } from "@/lib/prisma";

const input = z.object({ endpoint: z.string().trim().url().max(1000) });

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (!prisma) return Response.json({ ok: true, mode: "fixture" }, { status: 202 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });
  return Response.json({ ok: true });
}
