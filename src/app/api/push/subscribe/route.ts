import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSafePushEndpoint } from "@/lib/request-ip";
import { attachDeviceToPendingClaim, requestEmailVerification, type VerificationStatus } from "@/server/alerts/verification";

const input = z.object({
  subscription: z.object({
    endpoint: z.string().trim().url().max(1000).refine(isSafePushEndpoint),
    keys: z.object({
      p256dh: z.string().trim().min(1).max(500),
      auth: z.string().trim().min(1).max(500),
    }),
  }),
  email: z.string().trim().max(254).email().transform((v) => v.toLowerCase()).optional(),
  // Returned by /api/alerts to the browser that created the alert; lets this
  // subscription ride along on that pending confirmation mail.
  claim: z.string().trim().max(64).optional(),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid subscription." }, { status: 400 });
  if (!prisma) return Response.json({ ok: true, mode: "fixture" }, { status: 202 });

  const { subscription, email, claim } = parsed.data;
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: subscription.endpoint },
    select: { email: true, emailVerifiedAt: true },
  });
  // Double opt-in: the endpoint is only bound to an address once that address
  // confirmed this very subscription. Re-registering under the same, already
  // confirmed address keeps the binding; any other address starts over.
  const keepVerified = Boolean(email && existing?.email === email && existing.emailVerifiedAt);
  const row = await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      email: email ?? null,
      emailVerifiedAt: keepVerified ? existing!.emailVerifiedAt : null,
    },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      email: email ?? null,
    },
    select: { id: true },
  });

  let verification: VerificationStatus | null = null;
  if (email && keepVerified) verification = { status: "verified" };
  else if (email && (await attachDeviceToPendingClaim(claim, email, { pushSubscriptionId: row.id }))) {
    verification = { status: "pending", emailSent: false, attached: true };
  } else if (email) {
    verification = await requestEmailVerification({ email, pushSubscriptionId: row.id });
  }

  return Response.json({ ok: true, verification });
}
