import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { autoTriagePendingMatches } from "@/lib/admin-matching";
import { prisma } from "@/lib/prisma";

const input = z.object({
  limit: z.number().int().min(1).max(5000).optional(),
  dryRun: z.boolean().optional(),
});

// Accepts either the admin session cookie (the /admin/review button) or
// `Authorization: Bearer ${CRON_SECRET}` for headless callers.
async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header?.startsWith("Bearer ")) {
    const provided = Buffer.from(header.slice("Bearer ".length));
    const expected = Buffer.from(secret);
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) return true;
  }
  return isAdminRequest();
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const parsed = input.safeParse(body ?? {});
  if (!parsed.success) return Response.json({ error: "Invalid auto-triage request." }, { status: 400 });

  try {
    return Response.json(await autoTriagePendingMatches(parsed.data));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Auto-triage failed." }, { status: 500 });
  }
}
