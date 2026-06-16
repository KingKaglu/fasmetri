import { z } from "zod";
import { prisma } from "@/lib/prisma";

const input = z.object({
  subscription: z.object({
    endpoint: z.string().trim().url().max(1000),
    keys: z.object({
      p256dh: z.string().trim().min(1).max(500),
      auth: z.string().trim().min(1).max(500),
    }),
  }),
  email: z.string().trim().max(254).email().transform((v) => v.toLowerCase()).optional(),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid subscription." }, { status: 400 });
  if (!prisma) return Response.json({ ok: true, mode: "fixture" }, { status: 202 });

  const { subscription, email } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, email: email ?? null },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      email: email ?? null,
    },
  });

  return Response.json({ ok: true });
}
