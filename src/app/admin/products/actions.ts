"use server";

import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin-auth";
import { revalidatePublicCatalog } from "@/lib/revalidate";
import { unlinkOffer } from "@/lib/admin-matching";
import { prisma } from "@/lib/prisma";

// Mutations for /admin/products bulk actions. Server actions (not API routes)
// so they stay scoped to this page; all reuse the same auth gate as the APIs.

type ActionResult = { ok: true; detail?: string } | { ok: false; error: string };

async function guard(): Promise<ActionResult | null> {
  if (!(await isAdminRequest())) return { ok: false, error: "Admin login required." };
  if (!prisma) return { ok: false, error: "DATABASE_URL is required." };
  return null;
}

// Disband bad match groups: every offer of each selected canonical is moved
// to its own single-offer product (same semantics as the per-offer Unlink).
export async function bulkUnlinkProducts(productIds: string[]): Promise<ActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!productIds.length) return { ok: false, error: "No products selected." };

  let unlinked = 0;
  for (const productId of productIds.slice(0, 50)) {
    const offers = await prisma!.productOffer.findMany({
      where: { canonicalProductId: productId },
      select: { id: true },
    });
    for (const offer of offers) {
      try {
        await unlinkOffer(offer.id);
        unlinked += 1;
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Unlink failed." };
      }
    }
  }
  revalidatePath("/admin/products");
  revalidatePublicCatalog();
  return { ok: true, detail: `${unlinked} offer(s) unlinked` };
}

// Delete selected canonicals that have no offers at all (orphans). Canonicals
// that still hold offers are skipped, never force-deleted.
export async function bulkDeleteOrphans(productIds: string[]): Promise<ActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!productIds.length) return { ok: false, error: "No products selected." };

  const orphans = await prisma!.canonicalProduct.findMany({
    where: { id: { in: productIds.slice(0, 200) }, offers: { none: {} } },
    select: { id: true, productId: true },
  });
  if (!orphans.length) return { ok: false, error: "Selected products still have offers — nothing deleted." };

  await prisma!.canonicalProduct.deleteMany({ where: { id: { in: orphans.map((orphan) => orphan.id) } } });
  // Clean up the linked legacy Product rows when they hold no offers either.
  const legacyIds = orphans.map((orphan) => orphan.productId).filter((id): id is string => Boolean(id));
  if (legacyIds.length) {
    await prisma!.product.deleteMany({ where: { id: { in: legacyIds }, offers: { none: {} } } });
  }
  revalidatePath("/admin/products");
  revalidatePublicCatalog();
  return { ok: true, detail: `${orphans.length} orphan(s) deleted` };
}

// Merge two canonical products: every offer (and alert) of `sourceId` moves to
// `targetId`, then the source canonical + its empty legacy product are removed.
export async function mergeCanonicalProducts(targetId: string, sourceId: string): Promise<ActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!targetId || !sourceId || targetId === sourceId) return { ok: false, error: "Choose two different products." };

  const [target, source] = await Promise.all([
    prisma!.canonicalProduct.findUnique({ where: { id: targetId }, select: { id: true, productId: true, title: true } }),
    prisma!.canonicalProduct.findUnique({ where: { id: sourceId }, select: { id: true, productId: true, title: true } }),
  ]);
  if (!target || !source) return { ok: false, error: "Product not found." };

  const moved = await prisma!.$transaction(async (tx) => {
    const offers = await tx.productOffer.updateMany({
      where: { canonicalProductId: source.id },
      data: {
        canonicalProductId: target.id,
        ...(target.productId ? { productId: target.productId } : {}),
        reason: `Merged from "${source.title}" in admin.`,
      },
    });
    if (source.productId && target.productId) {
      // Catch offers/alerts only linked via the legacy product.
      await tx.productOffer.updateMany({ where: { productId: source.productId }, data: { productId: target.productId } });
      await tx.userPriceAlert.updateMany({ where: { productId: source.productId }, data: { productId: target.productId } });
    }
    await tx.canonicalProduct.delete({ where: { id: source.id } });
    if (source.productId) {
      await tx.product.deleteMany({ where: { id: source.productId, offers: { none: {} } } });
    }
    return offers.count;
  });

  revalidatePath("/admin/products");
  revalidatePublicCatalog();
  return { ok: true, detail: `${moved} offer(s) moved to "${target.title}"` };
}
