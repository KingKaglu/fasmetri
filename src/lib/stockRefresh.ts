/**
 * Zoommer's listing API reports isInStock=false for every product, so stock is
 * only ever readable from the product detail page. A price-only sync that skips
 * the detail fetch leaves stock frozen at whatever the last detail run happened
 * to see — which is how a live store ended up showing as almost entirely out of
 * stock in the public catalogue. These rules decide when the detail page has to
 * be re-read for stock alone, independent of whether specs or the title changed.
 */

export const STOCK_MAX_AGE_MS = 6 * 60 * 60 * 1_000;

/**
 * True when the detail page must be re-read to trust this offer's stock:
 * stock was never resolved, or it was resolved too long ago.
 */
export function stockNeedsRefresh(
  availability: string | null | undefined,
  stockCheckedAt: string | null | undefined,
  now: number = Date.now(),
  maxAgeMs: number = STOCK_MAX_AGE_MS,
): boolean {
  // UNKNOWN means no detail run ever resolved it; anything else was read from a
  // detail page and is only as good as the timestamp that came with it.
  if (availability !== "IN_STOCK" && availability !== "OUT_OF_STOCK") return true;
  if (!stockCheckedAt) return true;
  const checkedAt = Date.parse(stockCheckedAt);
  if (!Number.isFinite(checkedAt)) return true;
  return now - checkedAt > maxAgeMs;
}
