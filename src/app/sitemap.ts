import { MetadataRoute } from "next";
import { PUBLIC_CATEGORY_SLUGS, PUBLIC_CATEGORY_TAXONOMY } from "@/config/categoryMapping";
import { categoryFixtures, productFixtures, shopFixtures } from "@/lib/fixtures";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const [products, categories, shops] = await Promise.all([listSitemapProducts(), listSitemapCategories(), listSitemapShops()]);
  return [
    "", "/search", "/deals", "/categories", "/shops", "/about", "/contact",
    ...products.map((product) => `/products/${product.slug}`),
    ...categories.map((category) => `/categories/${category.slug}`),
    ...shops.map((shop) => `/shops/${shop.slug}`),
  ].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}

async function listSitemapProducts() {
  if (!prisma) return productFixtures.map((product) => ({ slug: product.slug }));

  try {
    return await prisma.product.findMany({
      where: {
        isPublic: true,
        archivedAt: null,
        needsReview: false,
        categoryNeedsReview: false,
        // Public MVP scope: phones + laptops only.
        OR: [
          { category: { slug: { in: [...PUBLIC_CATEGORY_SLUGS] } } },
          { categorySuggestedSlug: { in: [...PUBLIC_CATEGORY_SLUGS] } },
        ],
        offers: { some: { shop: { enabled: true }, currentPrice: { gt: 0 } } },
      },
      orderBy: { updatedAt: "desc" },
      select: { slug: true },
      take: 3000,
    });
  } catch {
    return productFixtures.map((product) => ({ slug: product.slug }));
  }
}

async function listSitemapCategories() {
  const publicSlugs = new Set(
    Object.entries(PUBLIC_CATEGORY_TAXONOMY)
      .filter(([, category]) => category.public)
      .map(([slug]) => slug),
  );

  if (!prisma) return categoryFixtures.filter((category) => publicSlugs.has(category.slug));

  try {
    const categories = await prisma.category.findMany({
      where: { slug: { in: [...publicSlugs] } },
      select: { slug: true },
    });
    return categories;
  } catch {
    return categoryFixtures.filter((category) => publicSlugs.has(category.slug));
  }
}

async function listSitemapShops() {
  if (!prisma) return shopFixtures.filter((shop) => shop.enabled).map((shop) => ({ slug: shop.slug }));

  try {
    return await prisma.shop.findMany({
      where: { enabled: true },
      select: { slug: true },
    });
  } catch {
    return shopFixtures.filter((shop) => shop.enabled).map((shop) => ({ slug: shop.slug }));
  }
}
