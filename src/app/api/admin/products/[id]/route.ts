import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { normalizeProductName, slugifyProduct } from "@/lib/matching";
import { revalidatePublicCatalog } from "@/lib/revalidate";

const productUpdate = z.object({
  name: z.string().trim().min(2).optional(),
  categoryId: z.string().nullable().optional(),
  brand: z.string().trim().nullable().optional(),
  model: z.string().trim().nullable().optional(),
  categoryLocked: z.boolean().optional(),
  matchingLocked: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return Response.json({ error: "Admin login required." }, { status: 401 });
  if (!prisma) return Response.json({ error: "DATABASE_URL is required." }, { status: 503 });
  const parsed = productUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid product update." }, { status: 400 });
  const { id } = await context.params;
  const data = parsed.data.name
    ? { ...parsed.data, normalizedName: normalizeProductName(parsed.data.name), slug: slugifyProduct(parsed.data.name) }
    : { ...parsed.data };
  if (parsed.data.categoryLocked) {
    Object.assign(data, {
      manualCategoryId: parsed.data.categoryId ?? undefined,
      categoryNeedsReview: false,
      categoryConfidence: 100,
      categoryReason: "ადმინისტრატორის მიერ დადასტურებული კატეგორია.",
    });
  } else if (parsed.data.categoryLocked === false) {
    Object.assign(data, { manualCategoryId: null });
  }
  const product = await prisma.product.update({ where: { id }, data });
  revalidatePublicCatalog();
  return Response.json({ product });
}
