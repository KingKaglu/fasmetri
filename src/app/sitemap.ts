import { MetadataRoute } from "next";
import { PUBLIC_CATEGORY_SLUGS } from "@/config/categoryMapping";
import { siteUrl } from "@/config/site";
import { PUBLIC_OFFER_MATCH_STATUSES } from "@/lib/catalog-types";
import { categoryFixtures, productFixtures, shopFixtures } from "@/lib/fixtures";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const [products, categories, shops] = await Promise.all([listSitemapProducts(), listSitemapCategories(), listSitemapShops()]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/deals`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/price-index`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/shops`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/categories/${category.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const shopEntries: MetadataRoute.Sitemap = shops.map((shop) => ({
    url: `${base}/shops/${shop.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${base}/products/${product.slug}`,
    lastModified: product.updatedAt ?? now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...shopEntries, ...productEntries];
}

type SitemapProduct = { slug: string; updatedAt: Date | null };

async function listSitemapProducts(): Promise<SitemapProduct[]> {
  if (!prisma) return productFixtures.map((product) => ({ slug: product.slug, updatedAt: null }));

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
      select: { slug: true, updatedAt: true },
      take: 3000,
    });
  } catch {
    return productFixtures.map((product) => ({ slug: product.slug, updatedAt: null }));
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
