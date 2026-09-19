import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Turning push off in the app's settings, or signing a device out of alerts.

const input = z.object({ token: z.string().trim().min(10).max(255) });

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid push token." }, { status: 400 });
  if (!prisma) return Response.json({ ok: true, mode: "fixture" }, { status: 202 });

  await prisma.appPushToken.deleteMany({ where: { token: parsed.data.token } }).catch(() => undefined);
  return Response.json({ ok: true });
}
