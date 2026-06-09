import { MetadataRoute } from "next";
import { PUBLIC_CATEGORY_SLUGS } from "@/config/categoryMapping";
import { siteUrl } from "@/config/site";
import { PUBLIC_OFFER_MATCH_STATUSES } from "@/lib/catalog-types";
import { categoryFixtures, productFixtures, shopFixtures } from "@/lib/fixtures";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
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
        // Public catalog scope.
        OR: [
          { category: { slug: { in: [...PUBLIC_CATEGORY_SLUGS] } } },
          { categorySuggestedSlug: { in: [...PUBLIC_CATEGORY_SLUGS] } },
        ],
        offers: {
          some: {
            shop: { enabled: true },
            currentPrice: { gt: 0 },
            matchStatus: { in: [...PUBLIC_OFFER_MATCH_STATUSES] },
            verificationStatus: "CONFIRMED",
          },
        },
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
  const publicSlugs = new Set<string>(PUBLIC_CATEGORY_SLUGS);

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
  if (!prisma) return shopFixtures.filter((shop) => shop.enabled && (shop.productCount ?? 0) > 0).map((shop) => ({ slug: shop.slug }));

  try {
    return await prisma.shop.findMany({
      where: {
        enabled: true,
        offers: {
          some: {
            currentPrice: { gt: 0 },
            matchStatus: { in: [...PUBLIC_OFFER_MATCH_STATUSES] },
            verificationStatus: "CONFIRMED",
            product: {
              isPublic: true,
              archivedAt: null,
              needsReview: false,
              categoryNeedsReview: false,
              OR: [
                { category: { slug: { in: [...PUBLIC_CATEGORY_SLUGS] } } },
                { categorySuggestedSlug: { in: [...PUBLIC_CATEGORY_SLUGS] } },
              ],
            },
          },
        },
      },
      select: { slug: true },
    });
  } catch {
    return shopFixtures.filter((shop) => shop.enabled && (shop.productCount ?? 0) > 0).map((shop) => ({ slug: shop.slug }));
  }
}
