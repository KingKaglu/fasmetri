import { OfferView, ProductView } from "@/lib/catalog-types";

// The public JSON API must not mirror the internal ProductView: fields like
// matchConfidence, verificationStatus, needsReview, archivedAt and the category
// scoring signals describe how our matcher reasoned, not the product a visitor
// asked for. They are also the bulk of the payload. Serialize an explicit
// public shape instead, so adding an internal field can never leak it.

export type PublicApiOffer = {
  id: string;
  shop: { slug: string; name: string; logoUrl: string | null; baseUrl: string };
  url: string;
  title: string;
  currentPrice: number;
  oldPrice: number | null;
  discountPercent: number;
  currency: string;
  availability: string;
  imageUrl: string | null;
  lastSeenAt: string;
  history?: { capturedAt: string; price: number }[];
};

export type PublicApiProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  model: string | null;
  imageUrl: string | null;
  category: { slug: string; nameKa: string; nameEn: string | null } | null;
  offerCount: number;
  offers: PublicApiOffer[];
  updatedAt: string;
};

function publicApiOffer(offer: OfferView): PublicApiOffer {
  return {
    id: offer.id,
    shop: {
      slug: offer.shop.slug,
      name: offer.shop.name,
      logoUrl: offer.shop.logoUrl ?? null,
      baseUrl: offer.shop.baseUrl,
    },
    url: offer.url,
    title: offer.title,
    currentPrice: offer.currentPrice,
    oldPrice: offer.oldPrice ?? null,
    discountPercent: offer.discountPercent,
    currency: offer.currency,
    availability: offer.availability,
    imageUrl: offer.imageUrl ?? null,
    lastSeenAt: offer.lastSeenAt,
    ...(offer.history ? { history: offer.history } : {}),
  };
}

export function publicApiProduct(product: ProductView): PublicApiProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand ?? null,
    model: product.model ?? null,
    imageUrl: product.imageUrl ?? null,
    category: product.category
      ? {
          slug: product.category.slug,
          nameKa: product.category.nameKa,
          nameEn: product.category.nameEn ?? null,
        }
      : null,
    offerCount: product.offerCount ?? product.offers.length,
    offers: product.offers.map(publicApiOffer),
    updatedAt: product.updatedAt,
  };
}
