"use client";

import { trackEvent } from "@/lib/analytics";

// Outbound link to a store offer. Fires the `shop_click` analytics event, then
// lets the browser follow `/api/out/[offerId]` (which records the first-party
// click server-side and redirects to the store with UTM tags). Tracking is
// fire-and-forget — if it throws, the link still opens.
export function ShopClickLink({
  offerId,
  productId,
  productName,
  category,
  shopName,
  price,
  sourceUrl,
  className,
  children,
  ariaLabel,
  title,
}: {
  offerId: string;
  productId?: string;
  productName?: string;
  category?: string | null;
  shopName?: string;
  price?: number;
  sourceUrl?: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <a
      href={`/api/out/${offerId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      title={title}
      className={className}
      onClick={() => {
        trackEvent("shop_click", {
          product_id: productId,
          product_name: productName,
          category: category ?? undefined,
          shop_name: shopName,
          price,
          source_url: sourceUrl,
        });
      }}
    >
      {children}
    </a>
  );
}
