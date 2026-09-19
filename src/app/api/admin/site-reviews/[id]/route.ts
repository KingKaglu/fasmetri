import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { revalidateReviews } from "@/lib/revalidate";
import { REVIEW_BODY_MAX } from "@/lib/review-rules";

// Moderation for the public review wall. Hiding is the default action and is
// reversible; deleting is there for the cases where the content should not sit
// in the database at all (abuse, personal data a visitor pasted by mistake).

const patchInput = z.union([
  z.object({ action: z.enum(["hide", "show"]) }),
  z.object({ action: z.literal("reply"), reply: z.string().trim().max(REVIEW_BODY_MAX) }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });

  const parsed = patchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid review action." }, { status: 400 });
  const { id } = await context.params;

  const data =
    parsed.data.action === "reply"
      ? parsed.data.reply
        ? { reply: parsed.data.reply, repliedAt: new Date() }
        : { reply: null, repliedAt: null }
      : { hidden: parsed.data.action === "hide" };

  try {
    const updated = await prisma.siteReview.update({ where: { id }, data });
    revalidateReviews();
    return Response.json({ id: updated.id, hidden: updated.hidden, reply: updated.reply });
  } catch {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const { id } = await context.params;

  try {
    await prisma.siteReview.delete({ where: { id } });
    revalidateReviews();
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }
}
