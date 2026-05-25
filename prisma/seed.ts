import "../scripts/load-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PUBLIC_CATEGORY_TAXONOMY } from "../src/config/categoryMapping";
import { normalizeProductName } from "../src/lib/matching";

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/fasmetri?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const removedDemoProductSlugs = ["apple-iphone-16-128gb", "lenovo-ideapad-slim-5-14"];

const categories = [
  ["tech", "ტექნიკა", "Electronics"],
  ["mobiles", "მობილურები", "Mobiles"],
  ["phone-accessories", "ტელეფონის აქსესუარები", "Phone accessories"],
  ["laptops", "ლეპტოპები", "Laptops"],
  ["computers", "კომპიუტერები", "Computers"],
  ["televisions", "ტელევიზორები", "Televisions"],
  ["audio", "აუდიო", "Audio"],
  ["wearables", "სმარტ საათები", "Wearables"],
  ["gaming", "Gaming", "Gaming"],
  ["refrigerators", "მაცივრები", "Refrigerators"],
  ["washing-machines", "სარეცხი მანქანები", "Washing machines"],
  ["home-appliances", "საყოფაცხოვრებო ტექნიკა", "Home appliances"],
  ["small-appliances", "მცირე ტექნიკა", "Small appliances"],
  ["air-conditioners", "კონდიციონერები", "Air conditioners"],
  ["photo-video", "ფოტო/ვიდეო", "Photo and video"],
  ["clothing", "ტანსაცმელი", "Clothing"],
  ["shoes", "ფეხსაცმელი", "Shoes"],
  ["beauty", "სილამაზე და მოვლა", "Beauty"],
  ["furniture", "ავეჯი", "Furniture"],
  ["home-garden", "სახლი და ბაღი", "Home and garden"],
  ["sport", "სპორტი", "Sport"],
  ["kids", "საბავშვო", "Kids"],
  ["auto-accessories", "ავტო აქსესუარები", "Auto accessories"],
  ["supermarket", "საკვები/სუპერმარკეტი", "Groceries"],
  ["books-stationery", "წიგნები და საკანცელარიო", "Books and stationery"],
  ["pets", "ცხოველების მოვლა", "Pet supplies"],
  ["adult", "18+ პროდუქტები", "Adult products"],
  ["tools", "ხელსაწყოები", "Tools"],
];

const comparisonSeedProducts = [
  ["apple-iphone-17-pro-max-esim-256gb-cosmic-orange", "Apple iPhone 17 Pro Max e-SIM Only 256GB Cosmic Orange", "mobiles", 4299],
  ["apple-iphone-17-pro-256gb", "Apple iPhone 17 Pro 256GB", "mobiles", 3899],
  ["samsung-galaxy-s26-ultra-256gb", "Samsung Galaxy S26 Ultra 256GB", "mobiles", 3599],
  ["xiaomi-17-pro-256gb", "Xiaomi 17 Pro 256GB", "mobiles", 2499],
  ["apple-macbook-air-13-m4-256gb", "Apple MacBook Air 13 M4 256GB", "laptops", 3699],
  ["apple-macbook-pro-14-m4-pro-512gb", "Apple MacBook Pro 14 M4 Pro 512GB", "laptops", 6999],
  ["lenovo-ideapad-slim-5", "Lenovo IdeaPad Slim 5 Laptop", "laptops", 2199],
  ["asus-tuf-gaming-laptop", "Asus TUF Gaming Laptop", "laptops", 3299],
  ["dell-inspiron-work-laptop", "Dell Inspiron Work Laptop", "laptops", 2399],
  ["airpods-pro", "Apple AirPods Pro", "audio", 699],
  ["samsung-galaxy-buds", "Samsung Galaxy Buds", "audio", 349],
  ["apple-watch-series", "Apple Watch", "wearables", 1199],
  ["samsung-galaxy-watch", "Samsung Galaxy Watch", "wearables", 899],
  ["sony-wh-1000xm-headphones", "Sony WH-1000XM Headphones", "audio", 999],
  ["playstation-5-slim", "PlayStation 5 Slim", "gaming", 1799],
  ["lg-oled-tv", "LG OLED TV", "televisions", 3999],
  ["samsung-smart-tv", "Samsung Smart TV", "televisions", 1899],
  ["lg-refrigerator", "LG Refrigerator", "refrigerators", 2899],
  ["samsung-refrigerator", "Samsung Refrigerator", "refrigerators", 3199],
  ["bosch-washing-machine", "Bosch Washing Machine", "washing-machines", 1899],
  ["lg-washing-machine", "LG Washing Machine", "washing-machines", 2199],
  ["beko-dishwasher", "Beko Dishwasher", "home-appliances", 1499],
  ["midea-air-conditioner", "Midea Air Conditioner", "air-conditioners", 1699],
  ["dyson-vacuum-cleaner", "Dyson Vacuum Cleaner", "home-appliances", 2499],
  ["xiaomi-robot-vacuum", "Xiaomi Robot Vacuum Cleaner", "home-appliances", 899],
  ["philips-air-fryer", "Philips Air Fryer", "small-appliances", 499],
  ["delonghi-coffee-machine", "DeLonghi Coffee Machine", "small-appliances", 1299],
  ["logitech-wireless-mouse", "Logitech Wireless Mouse", "computers", 119],
  ["logitech-keyboard", "Logitech Keyboard", "computers", 189],
  ["samsung-gaming-monitor", "Samsung Gaming Monitor", "computers", 799],
  ["samsung-ssd-1tb", "Samsung SSD 1TB", "computers", 299],
  ["kingston-ssd-1tb", "Kingston SSD 1TB", "computers", 249],
  ["tp-link-router", "TP-Link Router", "computers", 179],
  ["anker-power-bank", "Anker Power Bank", "phone-accessories", 199],
  ["usb-c-fast-charger", "USB-C Fast Charger", "phone-accessories", 89],
  ["magsafe-wireless-charger", "MagSafe Wireless Charger", "phone-accessories", 149],
  ["iphone-pro-case", "iPhone Pro Case", "phone-accessories", 69],
  ["iphone-screen-protector", "iPhone Screen Protector", "phone-accessories", 39],
  ["creator-microphone", "Creator Microphone", "photo-video", 299],
  ["car-dash-cam", "Car Dash Cam", "auto-accessories", 349],
] as const;

async function main() {
  for (const [slug, nameKa, nameEn] of categories) {
    await prisma.category.upsert({ where: { slug }, update: { nameKa, nameEn }, create: { slug, nameKa, nameEn } });
  }
  for (const [slug, category] of Object.entries(PUBLIC_CATEGORY_TAXONOMY)) {
    await prisma.category.upsert({
      where: { slug },
      update: { nameKa: category.nameKa, nameEn: category.nameEn },
      create: { slug, nameKa: category.nameKa, nameEn: category.nameEn },
    });
  }
  await prisma.shop.upsert({ where: { slug: "alta" }, update: { needsConfiguration: true }, create: { slug: "alta", name: "Alta", baseUrl: "https://alta.ge", reliabilityLabel: "საჯარო კატალოგი", needsConfiguration: true } });
  await prisma.shop.upsert({ where: { slug: "zoommer" }, update: { needsConfiguration: false }, create: { slug: "zoommer", name: "Zoommer", baseUrl: "https://zoommer.ge", enabled: true, reliabilityLabel: "საჯარო კატალოგი", needsConfiguration: false } });
  for (const [slug, name, baseUrl, needsConfiguration] of [
    ["ee", "Elite Electronics", "https://ee.ge", false],
    ["veli", "Veli", "https://veli.store", true],
    ["extra", "Extra", "https://extra.ge", false],
    ["pcshop", "PCShop", "https://pcshop.ge", false],
  ] as const) {
    await prisma.shop.upsert({ where: { slug }, update: { needsConfiguration }, create: { slug, name, baseUrl, enabled: !needsConfiguration, needsConfiguration } });
  }
  await prisma.product.deleteMany({ where: { slug: { in: removedDemoProductSlugs } } });
  if (process.env.SEED_SAMPLE_PRODUCTS !== "false") await seedComparisonProducts();
}

async function seedComparisonProducts() {
  const categoryRows = await prisma.category.findMany({ select: { id: true, slug: true } });
  const shopRows = await prisma.shop.findMany({ where: { slug: { in: ["zoommer", "ee", "extra", "pcshop"] } } });
  const categoryIds = new Map(categoryRows.map((category) => [category.slug, category.id]));
  const shops = new Map(shopRows.map((shop) => [shop.slug, shop]));

  for (const [slug, name, categorySlug, price] of comparisonSeedProducts) {
    const product = await prisma.product.upsert({
      where: { slug },
      update: { name, normalizedName: normalizeProductName(name), categoryId: categoryIds.get(categorySlug), popularityScore: 70 },
      create: {
        slug,
        name,
        normalizedName: normalizeProductName(name),
        categoryId: categoryIds.get(categorySlug),
        popularityScore: 70,
        manualGroupKey: "seed:comparison-catalog",
      },
    });

    const shopSlugs = seedShopSlugs(categorySlug);
    for (const [index, shopSlug] of shopSlugs.entries()) {
      const shop = shops.get(shopSlug);
      if (!shop) continue;
      const multiplier = 1 + index * 0.055;
      const currentPrice = Math.round(price * multiplier);
      const oldPrice = index === 0 ? Math.round(currentPrice * 1.12) : null;
      const offer = await prisma.productOffer.upsert({
        where: { shopId_url: { shopId: shop.id, url: seedOfferUrl(shop.baseUrl, slug) } },
        update: { productId: product.id, title: name, currentPrice, oldPrice, discountPercent: oldPrice ? 11 : 0, availability: "IN_STOCK" },
        create: {
          productId: product.id,
          shopId: shop.id,
          url: seedOfferUrl(shop.baseUrl, slug),
          title: name,
          currentPrice,
          oldPrice,
          discountPercent: oldPrice ? 11 : 0,
          availability: "IN_STOCK",
        },
      });

      const historyCount = await prisma.priceHistory.count({ where: { offerId: offer.id } });
      if (!historyCount) {
        await prisma.priceHistory.createMany({
          data: [
            { offerId: offer.id, price: oldPrice ?? currentPrice, oldPrice: null, capturedAt: new Date("2026-05-18T09:00:00.000Z") },
            { offerId: offer.id, price: currentPrice, oldPrice, capturedAt: new Date("2026-05-22T09:00:00.000Z") },
          ],
        });
      }
    }
  }
}

function seedShopSlugs(categorySlug: string) {
  if (categorySlug === "computers" || categorySlug === "laptops") return ["pcshop", "zoommer"];
  if (["home-appliances", "small-appliances", "refrigerators", "washing-machines", "air-conditioners"].includes(categorySlug)) return ["ee", "extra"];
  return ["zoommer", "ee"];
}

function seedOfferUrl(baseUrl: string, slug: string) {
  return `${baseUrl}/?fasmetri_seed=${slug}`;
}

main().finally(async () => prisma.$disconnect());
