"use client";

import { CompareToggle } from "@/components/compare-toggle";
import { FavoriteToggle } from "@/components/favorite-toggle";

// Compare + favorite corner toggles as ONE client boundary.
//
// Rendered separately (as ProductCard does) the same slug and name cross into
// the RSC flight twice: once as CompareToggle's props and again inside
// FavoriteToggle's snapshot object. On a rail of 24 cards that is 48 redundant
// strings in the inline flight payload, each of which is also paid a second
// time because the flight is embedded in the HTML response. Passing the flat
// snapshot once and rebuilding the two components' props on the client keeps
// the behaviour, placement and a11y of the originals byte-for-byte while
// halving what has to be serialised.
//
// Both children still render their neutral state on the server and on first
// client paint, so the buttons are present, visible and clickable immediately
// — nothing here is deferred to hydration or to interaction.
export function CardToggles({
  slug,
  name,
  price,
  oldPrice,
  imageUrl,
  shopName,
  shopCount,
  categorySlug,
}: {
  slug: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  shopName?: string | null;
  shopCount?: number;
  categorySlug?: string | null;
}) {
  return (
    <>
      <CompareToggle slug={slug} name={name} />
      <FavoriteToggle snapshot={{ slug, name, price, oldPrice, imageUrl, shopName, shopCount, categorySlug }} />
    </>
  );
}
