import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { bulkApprovePossibleMatches } from "@/lib/admin-matching";
import { prisma } from "@/lib/prisma";

const input = z.object({
  minConfidence: z.number().int().min(50).max(100),
  category: z.enum(["mobiles", "laptops"]).optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid bulk approve request." }, { status: 400 });

  try {
    return Response.json(await bulkApprovePossibleMatches(parsed.data.minConfidence, parsed.data.category));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Bulk approve failed." }, { status: 500 });
  }
}
