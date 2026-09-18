import { MetadataRoute } from "next";
import { PUBLIC_CATEGORY_SLUGS } from "@/config/categoryMapping";
import { GAMES } from "@/config/gameCompatibility";
import { siteUrl } from "@/config/site";
import { PUBLIC_OFFER_MATCH_STATUSES } from "@/lib/catalog-types";
import { isExcludedPublicCategory, isExcludedPublicName, isPublicOfferFields } from "@/config/productCuration";
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
    // High-intent landing page ("which laptop runs X"), one entry per game.
    { url: `${base}/games`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...GAMES.map((game) => ({
      url: `${base}/games?game=${game.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
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
    // The WHERE clause is only a cheap pre-filter. A slug belongs in the
    // sitemap exactly when /products/[slug] renders it, and that page runs
    // toPublicProduct: public category by relation (not by suggestion),
    // no excluded category or keyword, and at least one offer that passes
    // isPublicOffer — which also rejects non-product/outlet URLs and offers
    // under the matcher's AUTO band. Applying the same rules here is what
    // keeps 404s out of the file Google crawls.
    const products = await prisma.product.findMany({
      where: {
        isPublic: true,
        archivedAt: null,
        needsReview: false,
        categoryNeedsReview: false,
        category: { slug: { in: [...PUBLIC_CATEGORY_SLUGS] } },
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
      select: {
        slug: true,
        name: true,
        updatedAt: true,
        category: { select: { slug: true, nameKa: true, nameEn: true } },
        offers: {
          select: {
            url: true,
            currentPrice: true,
            matchStatus: true,
            verificationStatus: true,
            matchConfidence: true,
            shop: { select: { enabled: true } },
          },
        },
      },
      take: 3000,
    });

    return products
      .filter((product) => {
        if (isExcludedPublicCategory(product.category) || isExcludedPublicName(product.name)) return false;
        return product.offers.some((offer) =>
          isPublicOfferFields({
            url: offer.url,
            currentPrice: Number(offer.currentPrice ?? 0),
            matchStatus: offer.matchStatus,
            verificationStatus: offer.verificationStatus,
            matchConfidence: offer.matchConfidence,
            shop: offer.shop,
          }),
        );
      })
      .map((product) => ({ slug: product.slug, updatedAt: product.updatedAt }));
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
