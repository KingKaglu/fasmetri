import type { PrismaClient } from "@prisma/client";

// Shared price-anomaly guard for the per-store sync modules. A "new" price
// below 10% or above 300% of the stored price is almost always a scrape or
// store-side glitch (currency mixups, placeholder 1 GEL prices, missing
// digits). The sync keeps the old price and records the move here instead of
// publishing it; rows land in PriceAnomaly for admin review.

export const ANOMALY_MIN_RATIO = 0.1;
export const ANOMALY_MAX_RATIO = 3;

export function isAnomalousPriceChange(previousPrice: number, newPrice: number): boolean {
  if (!Number.isFinite(previousPrice) || previousPrice <= 0) return false;
  if (!Number.isFinite(newPrice) || newPrice <= 0) return false;
  const ratio = newPrice / previousPrice;
  return ratio < ANOMALY_MIN_RATIO || ratio > ANOMALY_MAX_RATIO;
}

export type PriceAnomalyInput = {
  store: string;
  category: string;
  offerUrl: string;
  title: string;
  previousPrice: number;
  newPrice: number;
};

// Best-effort: a missing table (migration not yet applied) or a transient DB
// error must not fail the whole sync — the price update is already skipped.
// Repeats of the same unresolved anomaly (same URL + same suspect price) are
// not duplicated on every 3h run.
export async function recordPriceAnomaly(db: PrismaClient, input: PriceAnomalyInput): Promise<void> {
  try {
    const existing = await db.priceAnomaly.findFirst({
      where: { store: input.store, offerUrl: input.offerUrl, newPrice: input.newPrice, resolved: false },
      select: { id: true },
    });
    if (existing) return;
    await db.priceAnomaly.create({
      data: {
        store: input.store,
        category: input.category,
        offerUrl: input.offerUrl,
        title: input.title,
        previousPrice: input.previousPrice,
        newPrice: input.newPrice,
        ratio: input.newPrice / input.previousPrice,
      },
    });
  } catch (error) {
    console.warn(`[price-anomaly] Failed to record anomaly for ${input.offerUrl}:`, error);
  }
}
