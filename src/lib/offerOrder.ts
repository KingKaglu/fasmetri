import type { Availability } from "@/lib/catalog-types";

// Display order for a product's offers: what you can buy first, then price.
//
// offers[0] is treated as "the best offer" everywhere — the product hero's
// CTA, the "საუკეთესო ფასი" badge, the price on every product card. Sorting by
// price alone let a cheaper out-of-stock listing take that slot, so the site
// advertised a price nobody could buy at. UNKNOWN sits between the two: Kontakt
// and others omit availability on some fetches, and that is not the same as
// "sold out".
const AVAILABILITY_RANK: Record<Availability, number> = {
  IN_STOCK: 0,
  UNKNOWN: 1,
  OUT_OF_STOCK: 2,
};

export function availabilityRank(availability: Availability | string | null | undefined) {
  return AVAILABILITY_RANK[availability as Availability] ?? AVAILABILITY_RANK.UNKNOWN;
}

export function compareOffersForDisplay(
  left: { availability: Availability | string | null | undefined; currentPrice: number },
  right: { availability: Availability | string | null | undefined; currentPrice: number },
) {
  return availabilityRank(left.availability) - availabilityRank(right.availability) || left.currentPrice - right.currentPrice;
}
