import { CategoryView, ProductView, ScrapeRunView, ShopView } from "@/lib/catalog-types";
import { PUBLIC_CATEGORY_TAXONOMY } from "@/config/categoryMapping";
import { generatedCategoryFixtures, generatedProductFixtures, generatedShopFixtures } from "@/lib/generated-fixtures";

const updated = "2026-05-21T11:20:00.000Z";

const baseCategoryFixtures: CategoryView[] = [
  ["tech", "ტექნიკა", "Electronics"],
  ["mobiles", "მობილურები", "Mobiles"],
  ["tablets", "ტაბლეტები", "Tablets"],
  ["tablet-accessories", "ტაბლეტის აქსესუარები", "Tablet accessories"],
  ["phone-accessories", "ტელეფონის აქსესუარები", "Phone accessories"],
  ["laptops", "ლეპტოპები", "Laptops"],
  ["computers", "კომპიუტერები", "Computers"],
  ["computer-accessories", "კომპიუტერის აქსესუარები", "Computer accessories"],
  ["cables-adapters", "კაბელები და ადაპტერები", "Cables and adapters"],
  ["monitors", "მონიტორები", "Monitors"],
  ["televisions", "ტელევიზორები", "Televisions"],
  ["audio", "აუდიო", "Audio"],
  ["wearables", "სმარტ საათები", "Wearables"],
  ["gaming", "Gaming", "Gaming"],
  ["refrigerators", "მაცივრები", "Refrigerators"],
  ["washing-machines", "სარეცხი მანქანები", "Washing machines"],
  ["home-appliances", "საყოფაცხოვრებო ტექნიკა", "Home appliances"],
  ["small-appliances", "მცირე ტექნიკა", "Small appliances"],
  ["kitchen-dishes", "სამზარეულო და ჭურჭელი", "Kitchen and dishes"],
  ["air-conditioners", "კონდიციონერები", "Air conditioners"],
  ["photo-video", "ფოტო/ვიდეო", "Photo and video"],
  ["clothing", "ტანსაცმელი", "Clothing"],
  ["shoes", "ფეხსაცმელი", "Shoes"],
  ["beauty", "სილამაზე და მოვლა", "Beauty"],
  ["furniture", "ავეჯი", "Furniture"],
  ["home-garden", "სახლი და ბაღი", "Home and garden"],
  ["sport", "სპორტი", "Sport"],
  ["kids", "საბავშვო", "Kids"],
  ["pets", "ცხოველების მოვლა", "Pet supplies"],
  ["auto-accessories", "ავტო აქსესუარები", "Auto accessories"],
  ["supermarket", "საკვები/სუპერმარკეტი", "Groceries"],
  ["other", "სხვა", "Other"],
].map(([slug, nameKa, nameEn], index) => ({
  id: `category-${index}`,
  slug,
  nameKa,
  nameEn,
  productCount: 0,
}));

const baseShopFixtures: ShopView[] = [
  {
    id: "shop-alta",
    slug: "alta",
    name: "Alta",
    baseUrl: "https://alta.ge",
    enabled: false,
    reliabilityLabel: "კონფიგურირებადი წყარო",
    needsConfiguration: false,
    lastScrapedAt: updated,
  },
  {
    id: "shop-zoommer",
    slug: "zoommer",
    name: "Zoommer",
    baseUrl: "https://zoommer.ge",
    enabled: false,
    reliabilityLabel: "კონფიგურირებადი წყარო",
    needsConfiguration: false,
    lastScrapedAt: updated,
  },
  {
    id: "shop-ee",
    slug: "ee",
    name: "Elite Electronics",
    baseUrl: "https://ee.ge",
    enabled: false,
    reliabilityLabel: "სელექტორები დასაზუსტებელია",
    needsConfiguration: true,
  },
  {
    id: "shop-veli",
    slug: "veli",
    name: "Veli",
    baseUrl: "https://veli.store",
    enabled: false,
    reliabilityLabel: "API/სელექტორები დასაზუსტებელია",
    needsConfiguration: true,
  },
];

function withReadableCategoryNames(categories: CategoryView[]) {
  return categories.map((category) => {
    const taxonomy = PUBLIC_CATEGORY_TAXONOMY[category.slug as keyof typeof PUBLIC_CATEGORY_TAXONOMY];
    return taxonomy ? { ...category, nameKa: taxonomy.nameKa, nameEn: taxonomy.nameEn } : category;
  });
}

export const categoryFixtures: CategoryView[] = generatedCategoryFixtures.length
  ? withReadableCategoryNames(generatedCategoryFixtures)
  : withReadableCategoryNames(baseCategoryFixtures);

export const shopFixtures: ShopView[] = generatedShopFixtures.length ? generatedShopFixtures : baseShopFixtures;

export const productFixtures: ProductView[] = generatedProductFixtures;

export const scrapeRunFixtures: ScrapeRunView[] = [
  {
    id: "run-fixture-1",
    shopName: "Alta",
    shopSlug: "alta",
    status: "SKIPPED",
    startedAt: updated,
    finishedAt: updated,
    pagesVisited: 0,
    offersSeen: 0,
    errorLog: ["SCRAPER_ENABLED=false: fixture mode"],
  },
];
