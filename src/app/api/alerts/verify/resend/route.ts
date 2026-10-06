import { z } from "zod";
import { isLikelyBot } from "@/lib/bot-detect";
import { prisma } from "@/lib/prisma";
import { requestEmailVerification } from "@/server/alerts/verification";

// "Send the confirmation mail again". Throttled per address inside
// requestEmailVerification (MIN_RESEND_INTERVAL_MS between mails,
// MAX_SENDS_PER_WINDOW per hour), shared with every route that can send one,
// so this cannot be used to flood an inbox.

const input = z.object({
  email: z.string().trim().min(3).max(254).email().transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  if (isLikelyBot(request.headers.get("user-agent"))) {
    return Response.json({ error: "Unsupported client." }, { status: 403 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid email." }, { status: 400 });
  if (!prisma) return Response.json({ accepted: true, mode: "fixture" }, { status: 202 });

  // Only for an address that actually has something waiting on it — this must
  // not become a free "mail any address" endpoint.
  const email = parsed.data.email;
  const [alerts, requests] = await Promise.all([
    prisma.userPriceAlert.count({ where: { email, status: "ACTIVE" } }),
    prisma.stockRequest.count({ where: { email, notified: false } }),
  ]);
  if (!alerts && !requests) return Response.json({ error: "Nothing to confirm." }, { status: 404 });

  const verification = await requestEmailVerification({ email });
  const throttled = verification.status === "pending" && verification.retryAfterSeconds != null;
  return Response.json(
    { verification },
    throttled ? { status: 429, headers: { "retry-after": String(verification.retryAfterSeconds) } } : undefined,
  );
}
