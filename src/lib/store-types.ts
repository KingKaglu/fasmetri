import type { Prisma } from "@prisma/client";

export type ParentProductWithVariants = Prisma.ParentProductGetPayload<{
  include: {
    variants: {
      include: {
        offers: {
          include: { shop: true };
        };
      };
    };
    category: true;
  };
}>;

export type ProductVariantWithOffers = Prisma.ProductVariantGetPayload<{
  include: {
    parentProduct: {
      include: { category: true };
    };
    offers: {
      include: { shop: true };
    };
  };
}>;
