import type { RawOfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RawScrapedOffer = {
  url: string;
  title: string;
  price: number;
  oldPrice?: number;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  imageUrl?: string;
  externalId?: string;
  brand?: string;
  model?: string;
  categorySlug?: string;
  sourceCategory?: string;
  breadcrumbs?: string[];
  sourceBreadcrumbs?: string[];
  description?: string;
  rawSpecsJson?: Record<string, unknown>;
};

export type SaveRawOfferResult = {
  id: string;
  isNew: boolean;
  isDuplicate: boolean;
  status: RawOfferStatus;
};

export type ImportStats = {
  batchId: string;
  storeKey: string;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  durationMs?: number;
};

export function createImportBatch(storeKey: string, category?: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const parts = ["import", storeKey];
  if (category) parts.push(category);
  parts.push(ts);
  return parts.join(":");
}

export function normalizeRawPrice(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function normalizeRawAvailability(raw: unknown): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const signal = (typeof raw === "string" ? raw : "").toLowerCase();
  if (signal.includes("outofstock") || signal === "out_of_stock" || signal === "false") return "OUT_OF_STOCK";
  if (signal.includes("instock") || signal === "in_stock" || signal === "true") return "IN_STOCK";
  return "UNKNOWN";
}

export async function dedupeRawOfferByShopAndUrl(shopId: string, url: string): Promise<boolean> {
  if (!prisma) return false;
  const existing = await prisma.rawOffer.findUnique({
    where: { shopId_originalUrl: { shopId, originalUrl: url } },
    select: { id: true },
  });
  return existing !== null;
}

export async function saveRawOffer(
  shopId: string,
  storeKey: string,
  offer: RawScrapedOffer,
  batchId: string,
): Promise<SaveRawOfferResult> {
  if (!prisma) throw new Error("DATABASE_URL is required for import.");

  const discount =
    offer.oldPrice && offer.oldPrice > offer.price
      ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)
      : 0;

  const existing = await prisma.rawOffer.findUnique({
    where: { shopId_originalUrl: { shopId, originalUrl: offer.url } },
    select: { id: true },
  });

  const data = {
    storeKey,
    externalId: offer.externalId,
    originalTitle: offer.title,
    originalImageUrl: offer.imageUrl,
    rawPrice: offer.price,
    rawOldPrice: offer.oldPrice,
    rawDiscount: discount,
    availability: offer.availability,
    rawCategory: offer.categorySlug,
    sourceCategory: offer.sourceCategory ?? offer.categorySlug,
    breadcrumbs: (offer.breadcrumbs ?? []) as object,
    sourceBreadcrumbs: (offer.sourceBreadcrumbs ?? offer.breadcrumbs ?? []) as object,
    description: offer.description,
    rawSpecsJson: (offer.rawSpecsJson ?? {}) as object,
    importBatchId: batchId,
    brand: offer.brand,
    model: offer.model,
    categorySlug: offer.categorySlug,
    status: "IMPORTED" as RawOfferStatus,
    scrapedAt: new Date(),
  };

  if (existing) {
    const updated = await prisma.rawOffer.update({
      where: { shopId_originalUrl: { shopId, originalUrl: offer.url } },
      data: { ...data, status: "IMPORTED" as RawOfferStatus },
      select: { id: true, status: true },
    });
    return { id: updated.id, isNew: false, isDuplicate: false, status: updated.status };
  }

  const created = await prisma.rawOffer.create({
    data: { shopId, originalUrl: offer.url, ...data },
    select: { id: true, status: true },
  });
  return { id: created.id, isNew: true, isDuplicate: false, status: created.status };
}

export function logImportProgress(stats: ImportStats): void {
  const duration = stats.durationMs != null ? ` duration=${(stats.durationMs / 1000).toFixed(1)}s` : "";
  console.log(
    [
      `import:${stats.storeKey}: processed=${stats.processed}`,
      `created=${stats.created}`,
      `updated=${stats.updated}`,
      `skipped=${stats.skipped}`,
      `failed=${stats.failed}`,
      `batch=${stats.batchId}`,
    ].join(" ") + duration,
  );
}
