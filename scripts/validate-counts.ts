import "./load-env";
import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import { PUBLIC_CATEGORY_SLUGS } from "../src/config/categoryMapping";
import { listProducts } from "../src/lib/catalog";
import { PUBLIC_LIST_PAGE_SIZE } from "../src/lib/publicQueryParams";

const db = prisma;
if (!db) throw new Error("DATABASE_URL is required for validate:counts.");

type PublicProduct = Awaited<ReturnType<typeof listProducts>>[number];

async function main() {
  const failures: string[] = [];
  const allProducts = await listProducts({ publicSafe: true, paginate: false });
  const totalDeals = allProducts.filter(hasActiveDeal).length;

  console.log("\nPublic catalog totals");
  console.log(`  total products: ${allProducts.length}`);
  console.log(`  total active deals: ${totalDeals}`);

  if (allProducts.length <= 1) {
    failures.push(`public catalog has only ${allProducts.length} products`);
  }

  console.log("\nProducts per category");
  for (const slug of PUBLIC_CATEGORY_SLUGS) {
    const totalProducts = await listProducts({ publicSafe: true, category: slug, paginate: false });
    const visibleProducts = await listProducts({ publicSafe: true, category: slug, page: 1, pageSize: PUBLIC_LIST_PAGE_SIZE });
    const activeDeals = totalProducts.filter(hasActiveDeal).length;

    console.log(`  ${slug}:`);
    console.log(`    total products: ${totalProducts.length}`);
    console.log(`    visible on page 1: ${visibleProducts.length}`);
    console.log(`    active deals: ${activeDeals}`);

    if (visibleProducts.length > totalProducts.length) {
      failures.push(`${slug} visible count ${visibleProducts.length} exceeds total ${totalProducts.length}`);
    }
    if (slug === "laptops" && totalProducts.length <= 1) {
      failures.push("laptops category total collapsed to 1 or less");
    }
  }

  console.log("\nStore-level counts");
  for (const shop of storeCounts(allProducts)) {
    console.log(`  ${shop.slug}:`);
    console.log(`    products found in this store: ${shop.products}`);
    console.log(`    active deal products: ${shop.deals}`);
  }

  await validateShopLabels(failures);

  if (failures.length) {
    console.error("\nCount validation failed");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nCount validation passed");
}

function hasActiveDeal(product: PublicProduct) {
  return product.offers.some((offer) => offer.discountPercent > 0);
}

function storeCounts(products: PublicProduct[]) {
  const counts = new Map<string, { slug: string; products: Set<string>; deals: Set<string> }>();

  for (const product of products) {
    for (const offer of product.offers) {
      const current = counts.get(offer.shop.id) ?? {
        slug: offer.shop.slug,
        products: new Set<string>(),
        deals: new Set<string>(),
      };
      current.products.add(product.id);
      if (offer.discountPercent > 0) current.deals.add(product.id);
      counts.set(offer.shop.id, current);
    }
  }

  return [...counts.values()]
    .map((shop) => ({
      slug: shop.slug,
      products: shop.products.size,
      deals: shop.deals.size,
    }))
    .sort((left, right) => right.products - left.products);
}

async function validateShopLabels(failures: string[]) {
  const shopCard = await readFile("src/components/shop-card.tsx", "utf8");
  const shopPage = await readFile("src/app/shops/[slug]/page.tsx", "utf8");

  if (shopCard.includes("უნიკალური პროდუქტი")) {
    failures.push("ShopCard still labels store-level count as უნიკალური პროდუქტი");
  }
  if (shopPage.includes("უნიკალური პროდუქტი")) {
    failures.push("shop detail page still labels store-level count as უნიკალური პროდუქტი");
  }
}

main()
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
