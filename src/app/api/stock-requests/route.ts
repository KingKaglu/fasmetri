import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isLikelyBot } from "@/lib/bot-detect";
import { normalizeSearchText } from "@/lib/searchKeywords";

// "Tell me when you stock this", captured from the zero-results state. The
// visitor has just told us exactly what the catalog is missing, which is worth
// more than the email address: even if they never come back, the row is a vote
// for a product to add. See /admin/searches.
const stockRequestInput = z.object({
  email: z.string().trim().min(3).max(254).email().transform((value) => value.toLowerCase()),
  query: z.string().trim().min(2).max(120),
});

// Per-email cap, same idea as the price-alert cap: bound the rows one address
// can create without needing a separate rate-limit table.
const MAX_REQUESTS_PER_EMAIL = 30;

export async function POST(request: Request) {
  if (isLikelyBot(request.headers.get("user-agent"))) {
    return Response.json({ error: "Unsupported client." }, { status: 403 });
  }

  const parsed = stockRequestInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request payload.", issues: parsed.error.issues }, { status: 400 });
  }
  if (!prisma) return Response.json({ accepted: true, mode: "fixture" }, { status: 202 });

  const normalized = normalizeSearchText(parsed.data.query);
  if (!normalized) return Response.json({ error: "Invalid request payload." }, { status: 400 });

  const existing = await prisma.stockRequest.findUnique({
    where: { email_normalized: { email: parsed.data.email, normalized } },
    select: { id: true },
  });
  // Asking twice for the same thing is a no-op, not an error: the visitor just
  // wants reassurance it was recorded.
  if (existing) return Response.json({ accepted: true, duplicate: true }, { status: 200 });

  const count = await prisma.stockRequest.count({ where: { email: parsed.data.email } });
  if (count >= MAX_REQUESTS_PER_EMAIL) {
    return Response.json({ error: "Request limit reached for this email." }, { status: 429 });
  }

  await prisma.stockRequest.create({
    data: { email: parsed.data.email, query: parsed.data.query, normalized },
  });
  return Response.json({ accepted: true }, { status: 201 });
}
