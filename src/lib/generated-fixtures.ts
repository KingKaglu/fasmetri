import type { CategoryView, ProductView, ShopView } from "@/lib/catalog-types";

export const generatedCategoryFixtures = [
  {
    id: "mobiles",
    slug: "mobiles",
    nameKa: "ტელეფონები",
    nameEn: "Phones",
    productCount: 0,
    dealCount: 0,
  },
  {
    id: "laptops",
    slug: "laptops",
    nameKa: "ლეპტოპები",
    nameEn: "Laptops",
    productCount: 0,
    dealCount: 0,
  },
] satisfies CategoryView[];

export const generatedShopFixtures = [] as ShopView[];

export const generatedProductFixtures = [] as ProductView[];
