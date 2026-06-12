import { unstable_cache } from "next/cache";
import { OfferAvailability, Prisma } from "@prisma/client";
import { PUBLIC_CATEGORY_SLUGS, PUBLIC_CATEGORY_TAXONOMY, isPublicCategorySlug } from "@/config/categoryMapping";
import { CategoryView, OfferView, ProductView, PUBLIC_OFFER_MATCH_STATUSES, ScrapeRunView, ShopView } from "@/lib/catalog-types";
import { categoryFixtures, productFixtures, scrapeRunFixtures, shopFixtures } from "@/lib/fixtures";
import {
  compareDealPriority,
  compareProductPriority,
  isExcludedPublicCategory,
  publicProducts,
  toPublicProduct,
} from "@/config/productCuration";
import { prisma } from "@/lib/prisma";
import { prettifyProductName } from "@/lib/productDisplay";
import { productSearchWhereTerms, rankSearchResults } from "@/lib/searchKeywords";

export type ProductFilters = {
  q?: string;
  category?: string;
  categorySlugs?: readonly string[];
  shop?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  availability?: string;
  sort?: string;
  dealsOnly?: boolean;
  inStockOnly?: boolean;
  publicSafe?: boolean;
  needsCategoryReview?: boolean;
  candidateLimit?: number;
  page?: number;
  pageSize?: number;
  paginate?: boolean;
};

const availabilityValues = new Set(Object.values(OfferAvailability));
const DEFAULT_PAGE_SIZE = 120;
const MAX_PAGE_SIZE = 200;
const confirmedPublicOfferWhere = {
  matchStatus: { in: [...PUBLIC_OFFER_MATCH_STATUSES] },
  verificationStatus: "CONFIRMED",
} satisfies Prisma.ProductOfferWhereInput;
const publicOfferWhere = {
  shop: { enabled: true },
  currentPrice: { gt: 0 },
  isActive: true,
  ...confirmedPublicOfferWhere,
} satisfies Prisma.ProductOfferWhereInput;

function numberValue(value: unknown) {
  if (value == null) return null;
  return Number(value);
}

function shopView(shop: {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  logoUrl: string | null;
  enabled: boolean;
  reliabilityLabel: string | null;
  needsConfiguration: boolean;
  lastScrapedAt: Date | null;
  productCount?: number;
  dealCount?: number;
}): ShopView {
  return {
    ...shop,
    lastScrapedAt: shop.lastScrapedAt?.toISOString() ?? null,
  };
}

type ProductRecord = Prisma.ProductGetPayload<{
  include: {
    category: true;
    offers: { include: { shop: true; histories: true } };
  };
}>;

type ProductSummaryRecord = Prisma.ProductGetPayload<{
  include: {
    category: true;
    _count: { select: { offers: true } };
    offers: { include: { shop: true } };
  };
}>;

function productView(product: ProductRecord | ProductSummaryRecord): ProductView {
  const category = normalizedCategoryView(product);

  return {
    id: product.id,
    slug: product.slug,
    name: prettifyProductName(product.name),
    canonicalKey: product.canonicalKey,
    productIdentity: product.productIdentity,
    brand: product.brand,
    model: product.model,
    imageUrl: product.imageUrl,
    category,
    popularityScore: product.popularityScore,
    manualCategoryId: product.manualCategoryId,
    categoryLocked: product.categoryLocked,
    categoryConfidence: product.categoryConfidence,
    categoryNeedsReview: product.categoryNeedsReview,
    categorySuggestedSlug: product.categorySuggestedSlug,
    categoryReason: product.categoryReason,
    categoryMatchedRules: product.categoryMatchedRules,
    categorySourceSignals: product.categorySourceSignals,
    matchingLocked: product.matchingLocked,
    isPublic: product.isPublic,
    needsReview: product.needsReview,
    archivedAt: product.archivedAt?.toISOString() ?? null,
    reviewedAt: product.reviewedAt?.toISOString() ?? null,
    crossStoreCheckedAt: product.crossStoreCheckedAt?.toISOString() ?? null,
    checkedShopsCount: product.checkedShopsCount,
    totalEnabledShopsCount: product.totalEnabledShopsCount,
    missingOfferDiscoveryStatus: product.missingOfferDiscoveryStatus,
    updatedAt: product.updatedAt.toISOString(),
    offerCount: "_count" in product ? product._count.offers : product.offers.length,
    offers: (() => {
      const mapped = product.offers.map((offer): OfferView => ({
        id: offer.id,
        shop: shopView(offer.shop),
        url: offer.url,
        title: offer.title,
        canonicalKey: offer.canonicalKey,
        productIdentity: offer.productIdentity,
        matchStatus: offer.matchStatus,
        matchConfidence: offer.matchConfidence,
        verificationStatus: offer.verificationStatus,
        currentPrice: numberValue(offer.currentPrice) ?? 0,
        oldPrice: numberValue(offer.oldPrice),
        discountPercent: offer.discountPercent,
        currency: offer.currency,
        availability: offer.availability,
        imageUrl: offer.imageUrl,
        lastSeenAt: offer.lastSeenAt.toISOString(),
        history: ("histories" in offer ? offer.histories : undefined)?.map((history) => ({
          capturedAt: history.capturedAt.toISOString(),
          price: numberValue(history.price) ?? 0,
        })),
      })).sort((left: OfferView, right: OfferView) => left.currentPrice - right.currentPrice);
      // Keep only the cheapest offer per shop (color variants share the same product record)
      const seenShops = new Set<string>();
      return mapped.filter((offer) => {
        if (seenShops.has(offer.shop.id)) return false;
        seenShops.add(offer.shop.id);
        return true;
      });
    })(),
  };
}

function normalizedCategoryView(product: Pick<ProductRecord | ProductSummaryRecord, "category" | "categorySuggestedSlug" | "categoryNeedsReview">) {
  if (isPublicCategorySlug(product.categorySuggestedSlug) && !product.categoryNeedsReview) {
    const taxonomyCategory = PUBLIC_CATEGORY_TAXONOMY[product.categorySuggestedSlug as keyof typeof PUBLIC_CATEGORY_TAXONOMY];
    if (taxonomyCategory) {
      return {
        id: product.categorySuggestedSlug,
        slug: product.categorySuggestedSlug,
        nameKa: taxonomyCategory.nameKa,
        nameEn: taxonomyCategory.nameEn,
      };
    }
  }

  return product.category
    ? {
        id: product.category.id,
        slug: product.category.slug,
        nameKa: product.category.nameKa,
        nameEn: product.category.nameEn,
      }
    : null;
}

function fixtureFilter(filters: ProductFilters) {
  let products = [...productFixtures];

  if (filters.category) products = products.filter((product) => product.category?.slug === filters.category);
  if (filters.categorySlugs?.length) products = products.filter((product) => filters.categorySlugs?.includes(product.category?.slug ?? ""));
  if (filters.shop) products = products.filter((product) => product.offers.some((offer) => offer.shop.slug === filters.shop));
  if (filters.minPrice != null) products = products.filter((product) => product.offers.some((offer) => offer.currentPrice >= filters.minPrice!));
  if (filters.maxPrice != null) products = products.filter((product) => product.offers.some((offer) => offer.currentPrice <= filters.maxPrice!));
  if (filters.minDiscount != null) products = products.filter((product) => product.offers.some((offer) => offer.discountPercent >= filters.minDiscount!));
  if (filters.availability) products = products.filter((product) => product.offers.some((offer) => offer.availability === filters.availability));
  if (filters.dealsOnly) products = products.filter((product) => product.offers.some((offer) => offer.discountPercent > 0));
  if (filters.inStockOnly) products = products.filter(productHasStock);

  if (filters.publicSafe) products = publicProducts(products);
  const visibleProducts = filters.q ? rankSearchResults(products, filters.q, filters.sort) : sortProducts(products, filters.sort);
  return filters.paginate === false ? visibleProducts : slicePage(visibleProducts, filters.page, filters.pageSize);
}

function productHasStock(product: Pick<ProductView, "offers">) {
  return product.offers.some((offer) => offer.availability === "IN_STOCK");
}

function productHasRealDeal(product: Pick<ProductView, "offers">) {
  return product.offers.some(
    (offer) => offer.discountPercent > 0 && offer.oldPrice != null && offer.oldPrice > offer.currentPrice,
  );
}

function sortProducts(products: ProductView[], sort = "recommended") {
  const minPrice = (product: ProductView) => Math.min(...product.offers.map((offer) => offer.currentPrice));
  const maxDiscount = (product: ProductView) => Math.max(...product.offers.map((offer) => offer.discountPercent));

  return [...products].sort((left, right) => {
    if (sort === "priority") return compareProductPriority(left, right);
    if (sort === "deal-priority") return compareDealPriority(left, right);
    if (sort === "discount") return maxDiscount(right) - maxDiscount(left);
    if (sort === "highest") return minPrice(right) - minPrice(left);
    if (sort === "newest" || sort === "updated") return right.updatedAt.localeCompare(left.updatedAt);
    if (sort === "popular") return right.popularityScore - left.popularityScore;
    if (sort === "lowest") return minPrice(left) - minPrice(right);
    // Default "recommended" order: in-stock first, then real deals, then the
    // best (lowest) price, then most recently updated — out-of-stock items
    // always sink to the bottom instead of dominating listings.
    return (
      Number(productHasStock(right)) - Number(productHasStock(left)) ||
      Number(productHasRealDeal(right)) - Number(productHasRealDeal(left)) ||
      minPrice(left) - minPrice(right) ||
      right.updatedAt.localeCompare(left.updatedAt)
    );
  });
}

function normalizePage(page?: number) {
  if (!page || Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
}

function normalizePageSize(pageSize?: number) {
  if (!pageSize || Number.isNaN(pageSize) || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}

function slicePage<T>(items: T[], page?: number, pageSize?: number) {
  const currentPage = normalizePage(page);
  const size = normalizePageSize(pageSize);
  const start = (currentPage - 1) * size;
  return items.slice(start, start + size);
}

// Sentinel slug that matches no category — used to force an empty public
// result when a caller requests a category outside the public MVP scope.
const NO_CATEGORY = "__no_public_category__";

// Public site is limited to phones + laptops. This intersects whatever the
// caller asked for with the public allowlist so out-of-scope products can
// never leak into search, deals, category pages, or the homepage.
function scopePublicCategories(filters: ProductFilters): ProductFilters {
  if (filters.category) {
    return isPublicCategorySlug(filters.category)
      ? { ...filters, categorySlugs: undefined }
      : { ...filters, category: undefined, categorySlugs: [NO_CATEGORY] };
  }
  const requested = filters.categorySlugs?.length ? filters.categorySlugs : PUBLIC_CATEGORY_SLUGS;
  const scoped = requested.filter(isPublicCategorySlug);
  return { ...filters, categorySlugs: scoped.length ? scoped : [NO_CATEGORY] };
}

export async function listProducts(filters: ProductFilters = {}) {
  filters = normalizeProductFilters(filters);
  if (filters.publicSafe) filters = scopePublicCategories(filters);
  if (!prisma) return fixtureFilter(filters);

  try {
    const shouldPaginate = filters.paginate !== false;
    const currentPage = normalizePage(filters.page);
    const size = normalizePageSize(filters.pageSize);
    const searchTerms = productSearchWhereTerms(filters.q);
    const candidateTake = filters.publicSafe
      ? filters.candidateLimit ?? (filters.q ? Math.max(360, size * currentPage * 5) : undefined)
      : size;
    const offerWhere: Prisma.ProductOfferWhereInput = {
      shop: filters.shop || filters.publicSafe ? { slug: filters.shop, enabled: filters.publicSafe ? true : undefined } : undefined,
      isActive: filters.publicSafe ? true : undefined,
      currentPrice: {
        gt: filters.publicSafe ? 0 : undefined,
        gte: filters.minPrice,
        lte: filters.maxPrice,
      },
      discountPercent: { gte: filters.dealsOnly ? Math.max(filters.minDiscount ?? 0, 1) : filters.minDiscount },
      matchStatus: filters.publicSafe ? { in: [...PUBLIC_OFFER_MATCH_STATUSES] } : undefined,
      verificationStatus: filters.publicSafe ? "CONFIRMED" : undefined,
      availability:
        filters.availability && availabilityValues.has(filters.availability as OfferAvailability)
          ? (filters.availability as OfferAvailability)
          : undefined,
    };
    const extraProductFilters = [
      searchTerms.length ? searchWhere(searchTerms, filters.publicSafe ? offerWhere : undefined) : undefined,
      categoryWhere(filters),
    ].filter((filter): filter is Prisma.ProductWhereInput => Boolean(filter && Object.keys(filter).length));
    const products = await prisma.product.findMany({
      where: {
        isPublic: filters.publicSafe ? true : undefined,
        archivedAt: filters.publicSafe ? null : undefined,
        needsReview: filters.publicSafe ? false : undefined,
        categoryNeedsReview: filters.publicSafe ? false : filters.needsCategoryReview,
        AND: extraProductFilters.length ? extraProductFilters : undefined,
        offers: { some: offerWhere },
      },
      include: {
        category: true,
        _count: { select: { offers: true } },
        offers: {
          where: offerWhere,
          orderBy: filters.dealsOnly ? [{ discountPercent: "desc" }, { currentPrice: "asc" }] : { currentPrice: "asc" },
          take: 3,
          include: { shop: true },
        },
      },
      orderBy: productOrderBy(filters.sort),
      skip: filters.publicSafe ? undefined : (currentPage - 1) * size,
      take: candidateTake,
    });

    const views = products.map(productView);
    const safeProducts = filters.publicSafe ? publicProducts(views) : views;
    // "Deals" everywhere means a real discount (old price above current), the
    // same definition the summary stats and the discount badges use.
    const dealFiltered = filters.publicSafe && filters.dealsOnly ? safeProducts.filter(productHasRealDeal) : safeProducts;
    const stockFiltered = filters.inStockOnly ? dealFiltered.filter(productHasStock) : dealFiltered;
    const visibleProducts = filters.q ? rankSearchResults(stockFiltered, filters.q, filters.sort) : sortProducts(stockFiltered, filters.sort);
    const pageResult = filters.publicSafe && shouldPaginate ? slicePage(visibleProducts, currentPage, size) : visibleProducts;
    return filters.publicSafe ? pageResult.map(slimPublicView) : pageResult;
  } catch {
    // With a real database configured, never fall back to demo fixtures — a
    // transient DB error on one page would otherwise show fake shops/counts
    // while another page shows live data. Fixtures are dev-only (no DB).
    return prisma ? [] : fixtureFilter(filters);
  }
}

// Public listings (grid + match-count) are memoized with unstable_cache, which
// rejects payloads over 2MB and throws an unhandledRejection. The heavy identity
// and category-matching fields are only needed for the dedup/scoring above, not
// for rendering, so strip them from the returned/cached result — this keeps the
// full unpaged catalog well under the limit and trims the streamed HTML.
function slimPublicView(view: ProductView): ProductView {
  return {
    ...view,
    productIdentity: undefined,
    canonicalKey: null,
    categoryReason: null,
    categoryMatchedRules: undefined,
    categorySourceSignals: undefined,
    offers: view.offers.map((offer) => ({
      ...offer,
      productIdentity: undefined,
      canonicalKey: null,
      history: undefined,
    })),
  };
}

function searchWhere(terms: string[], offerScope?: Prisma.ProductOfferWhereInput): Prisma.ProductWhereInput {
  const termFilters = terms.map((term): Prisma.ProductWhereInput => ({
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { normalizedName: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { model: { contains: term, mode: "insensitive" } },
      { canonicalKey: { contains: term, mode: "insensitive" } },
      { categorySuggestedSlug: { contains: term, mode: "insensitive" } },
      { category: { is: { slug: { contains: term, mode: "insensitive" } } } },
      { category: { is: { nameKa: { contains: term, mode: "insensitive" } } } },
      { category: { is: { nameEn: { contains: term, mode: "insensitive" } } } },
      { offers: { some: offerSearchWhere({ title: { contains: term, mode: "insensitive" } }, offerScope) } },
      { offers: { some: offerSearchWhere({ canonicalKey: { contains: term, mode: "insensitive" } }, offerScope) } },
    ],
  }));

  // Every term must match somewhere on the product (AND), otherwise a query
  // like "iphone 15" floods the candidate set with every product containing
  // a bare "15". rankSearchResults then enforces whole-token matching.
  return { AND: termFilters };
}

function offerSearchWhere(termWhere: Prisma.ProductOfferWhereInput, offerScope?: Prisma.ProductOfferWhereInput) {
  return offerScope ? { AND: [offerScope, termWhere] } : termWhere;
}

function categoryWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  if (filters.category) {
    return {
      OR: [
        { category: { slug: filters.category } },
        { categorySuggestedSlug: filters.category, categoryNeedsReview: false },
      ],
    };
  }

  if (filters.categorySlugs?.length) {
    return {
      OR: [
        { category: { slug: { in: [...filters.categorySlugs] } } },
        { categorySuggestedSlug: { in: [...filters.categorySlugs] }, categoryNeedsReview: false },
      ],
    };
  }

  return {};
}

function normalizeProductFilters(filters: ProductFilters): ProductFilters {
  return {
    ...filters,
    q: nonEmptyString(filters.q),
    category: nonEmptyString(filters.category),
    shop: nonEmptyString(filters.shop),
    availability: nonEmptyString(filters.availability),
    sort: nonEmptyString(filters.sort),
  };
}

function nonEmptyString(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function productOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
  if (sort === "popular" || sort === "priority") return { popularityScore: "desc" };
  if (sort === "newest") return { createdAt: "desc" };
  return { updatedAt: "desc" };
}

export async function getProduct(identifier: string) {
  const identifiers = productIdentifiers(identifier);
  if (!prisma) return productFixtures.find((product) => identifiers.includes(product.id) || identifiers.includes(product.slug)) ?? null;

  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: { in: identifiers } }, { slug: { in: identifiers } }] },
      include: {
        category: true,
        offers: {
          include: { shop: true, histories: { orderBy: { capturedAt: "asc" }, take: 40 } },
        },
      },
    });
    return product ? productView(product) : null;
  } catch {
    if (prisma) return null;
    return productFixtures.find((product) => identifiers.includes(product.id) || identifiers.includes(product.slug)) ?? null;
  }
}

// Public category/listing pages are rendered dynamically (they read filter
// search params), so without caching every visit re-ran the full public scan
// against the (remote) DB and streamed the product grid in 1-4s. The result of
// a given filter combination is identical for every visitor and only changes
// when the catalog is re-scraped, so we memoize per filter signature for a
// short window. Cache miss still does the full fetch; cache hit is instant.
function publicListingKey(filters: ProductFilters): string {
  return JSON.stringify([
    filters.q ?? "",
    filters.category ?? "",
    [...(filters.categorySlugs ?? [])].sort(),
    filters.shop ?? "",
    filters.minPrice ?? "",
    filters.maxPrice ?? "",
    filters.minDiscount ?? "",
    filters.availability ?? "",
    filters.sort ?? "",
    filters.dealsOnly ? 1 : 0,
    filters.inStockOnly ? 1 : 0,
    filters.page ?? 1,
    filters.pageSize ?? "",
    filters.paginate === false ? 0 : 1,
  ]);
}

export async function listPublicProducts(filters: ProductFilters = {}) {
  const scoped = { ...filters, publicSafe: true } as const;
  const cached = unstable_cache(
    () => listProducts(scoped),
    ["public-products-v10", publicListingKey(filters)],
    { revalidate: 300, tags: ["catalog"] },
  );
  return cached();
}

export async function listPublicProductMatches(filters: ProductFilters = {}) {
  const unpagedFilters = { ...filters, page: undefined, paginate: false };
  const scoped = { ...unpagedFilters, publicSafe: true } as const;
  const cached = unstable_cache(
    () => listProducts(scoped),
    ["public-product-matches-v8", publicListingKey(unpagedFilters)],
    { revalidate: 300, tags: ["catalog"] },
  );
  return cached();
}

export async function getPublicProduct(identifier: string) {
  const product = await getProduct(identifier);
  return product ? toPublicProduct(product) : null;
}

function productIdentifiers(identifier: string) {
  const identifiers = new Set([identifier.trim()]);
  try {
    identifiers.add(decodeURIComponent(identifier).trim());
  } catch {
    // Keep the raw route value when a browser sends malformed encoding.
  }
  return [...identifiers].filter(Boolean);
}

// Cross-request cache: category list + per-category counts change only when the
// catalog is re-scraped. Uncached, loadCategories runs an unbounded
// "all discounted products" scan on every category/deals render.
const cachedCategories = unstable_cache(loadCategories, ["categories-v7"], {
  revalidate: 600,
  tags: ["catalog"],
});

export async function listCategories(): Promise<CategoryView[]> {
  return cachedCategories();
}

async function loadCategories(): Promise<CategoryView[]> {
  if (!prisma) return categoryFixtures;
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { nameKa: "asc" },
    });
    const dealProducts = await prisma.product.findMany({
      where: { offers: { some: { discountPercent: { gt: 0 } } } },
      select: { categoryId: true },
    });
    const dealsByCategory = new Map<string, number>();
    for (const product of dealProducts) {
      if (!product.categoryId) continue;
      dealsByCategory.set(product.categoryId, (dealsByCategory.get(product.categoryId) ?? 0) + 1);
    }

    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      nameKa: category.nameKa,
      nameEn: category.nameEn,
      productCount: category._count.products,
      dealCount: dealsByCategory.get(category.id) ?? 0,
    }));
  } catch {
    return prisma ? [] : categoryFixtures;
  }
}

// Public categories come straight from the static taxonomy + the shared
// catalog summary, so the homepage cards, /categories, category detail
// headers, and filter dropdowns all show the same counts from one source.
export async function listPublicCategories(): Promise<CategoryView[]> {
  const summary = await getPublicCatalogSummary();

  return PUBLIC_CATEGORY_SLUGS.map((slug) => {
    const taxonomyCategory = PUBLIC_CATEGORY_TAXONOMY[slug as keyof typeof PUBLIC_CATEGORY_TAXONOMY];
    const counts = summary.categories[slug];
    return {
      id: slug,
      slug,
      nameKa: taxonomyCategory?.nameKa ?? slug,
      nameEn: taxonomyCategory?.nameEn ?? slug,
      productCount: counts?.products ?? 0,
      dealCount: counts?.deals ?? 0,
      inStockCount: counts?.inStock ?? 0,
    };
  })
    .filter((category) => !isExcludedPublicCategory(category) && (category.productCount ?? 0) > 0)
    .sort((left, right) => (right.productCount ?? 0) - (left.productCount ?? 0));
}

// Cross-request cache: listShops runs two groupBy scans over ALL offers, and
// for public pages those counts are discarded and replaced by the cached
// summary anyway. Caching keeps that scan off the per-request path of every
// category/product/deals render.
const cachedShops = unstable_cache(loadShops, ["shops-v4"], {
  revalidate: 600,
  tags: ["catalog"],
});

export async function listShops(): Promise<ShopView[]> {
  return cachedShops();
}

async function loadShops(): Promise<ShopView[]> {
  if (!prisma) return shopFixtures;
  try {
    const [shops, offerGroups, dealGroups] = await Promise.all([
      prisma.shop.findMany({ orderBy: { name: "asc" } }),
      prisma.productOffer.groupBy({ by: ["shopId", "productId"] }),
      prisma.productOffer.groupBy({ by: ["shopId", "productId"], where: { discountPercent: { gt: 0 } } }),
    ]);
    const productCounts = countGroupsByShop(offerGroups);
    const dealCounts = countGroupsByShop(dealGroups);

    return shops.map((shop) =>
      shopView({
        ...shop,
        productCount: productCounts.get(shop.id) ?? 0,
        dealCount: dealCounts.get(shop.id) ?? 0,
      }),
    );
  } catch {
    return prisma ? [] : shopFixtures;
  }
}

// The single public definition of an "active shop": it has at least one
// publicly visible product in the shared catalog summary. Every public surface
// (homepage, /shops, shop pages, filters) uses this list, so a store can never
// look active on one page and missing on another.
export async function listPublicShops(): Promise<ShopView[]> {
  const [shops, summary] = await Promise.all([listShops(), getPublicCatalogSummary()]);

  return shops
    .map((shop) => {
      const counts = summary.shops[shop.id];
      return {
        ...shop,
        productCount: counts?.products ?? 0,
        dealCount: counts?.deals ?? 0,
        lastScrapedAt: latestIsoDate(shop.lastScrapedAt, counts?.latestUpdate),
      };
    })
    .filter((shop) => shop.enabled && (shop.productCount ?? 0) > 0)
    .sort((left, right) => (right.productCount ?? 0) - (left.productCount ?? 0));
}

function latestIsoDate(...values: Array<string | null | undefined>) {
  const dates = values.filter((value): value is string => Boolean(value));
  if (!dates.length) return null;
  return dates.sort((left, right) => right.localeCompare(left))[0];
}

export async function getCatalogStats() {
  return (await getPublicCatalogSummary()).stats;
}

export type RecentPriceChange = {
  offerId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  categorySlug: string | null;
  shopName: string;
  shopLogoUrl: string | null;
  currentPrice: number;
  previousPrice: number | null;
  changedAt: string;
};

// Latest real price movements across the public catalog (one entry per
// product), for the homepage "recently updated prices" feed.
async function loadRecentPriceChanges(): Promise<RecentPriceChange[]> {
  if (!prisma) return [];
  try {
    const offers = await prisma.productOffer.findMany({
      where: {
        ...publicOfferWhere,
        lastPriceChangedAt: { not: null },
        previousSeenPrice: { not: null },
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
      orderBy: { lastPriceChangedAt: "desc" },
      take: 40,
      select: {
        id: true,
        currentPrice: true,
        previousSeenPrice: true,
        imageUrl: true,
        lastPriceChangedAt: true,
        shop: { select: { name: true, logoUrl: true } },
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            imageUrl: true,
            categorySuggestedSlug: true,
            category: { select: { slug: true } },
          },
        },
      },
    });

    const seenProducts = new Set<string>();
    const changes: RecentPriceChange[] = [];
    for (const offer of offers) {
      if (seenProducts.has(offer.product.id)) continue;
      const currentPrice = numberValue(offer.currentPrice) ?? 0;
      const previousPrice = numberValue(offer.previousSeenPrice);
      // Skip no-op entries where the recorded previous price equals current.
      if (currentPrice <= 0 || previousPrice == null || previousPrice === currentPrice) continue;
      seenProducts.add(offer.product.id);
      changes.push({
        offerId: offer.id,
        productSlug: offer.product.slug,
        productName: prettifyProductName(offer.product.name),
        imageUrl: offer.imageUrl ?? offer.product.imageUrl,
        categorySlug: offer.product.category?.slug ?? offer.product.categorySuggestedSlug,
        shopName: offer.shop.name,
        shopLogoUrl: offer.shop.logoUrl,
        currentPrice,
        previousPrice,
        changedAt: offer.lastPriceChangedAt!.toISOString(),
      });
      if (changes.length >= 5) break;
    }
    return changes;
  } catch {
    return [];
  }
}

const cachedRecentPriceChanges = unstable_cache(loadRecentPriceChanges, ["recent-price-changes-v1"], {
  revalidate: 300,
  tags: ["catalog"],
});

export async function listRecentPriceChanges(): Promise<RecentPriceChange[]> {
  return cachedRecentPriceChanges();
}

export type PublicCatalogStats = Awaited<ReturnType<typeof getCatalogStats>>;

type PublicCatalogSummary = {
  categories: Record<string, { products: number; deals: number; inStock: number }>;
  shops: Record<string, { products: number; deals: number; latestUpdate: string | null }>;
  stats: {
    shops: number;
    products: number;
    deals: number;
    inStock: number;
    outOfStock: number;
    totalOffers: number;
    latestUpdate: string | null;
  };
};

async function loadPublicCatalogSummary(): Promise<PublicCatalogSummary> {
  let publicCatalog: ProductView[];
  if (!prisma) {
    publicCatalog = publicProducts(productFixtures);
  } else {
    try {
      const products = await prisma.product.findMany({
        where: {
          isPublic: true,
          archivedAt: null,
          needsReview: false,
          categoryNeedsReview: false,
          // Public MVP scope: phones + laptops only (by relation or confirmed suggestion).
          OR: [
            { category: { slug: { in: [...PUBLIC_CATEGORY_SLUGS] } } },
            { categorySuggestedSlug: { in: [...PUBLIC_CATEGORY_SLUGS] } },
          ],
          offers: { some: publicOfferWhere },
        },
        include: {
          category: true,
          _count: { select: { offers: true } },
          offers: {
            where: publicOfferWhere,
            include: { shop: true },
            orderBy: { currentPrice: "asc" },
          },
        },
      });

      publicCatalog = publicProducts(products.map(productView));
    } catch {
      // Never substitute demo fixtures when a real DB exists — an empty (but
      // honest) summary beats fake counts that disagree with other pages.
      publicCatalog = prisma ? [] : publicProducts(productFixtures);
    }
  }

  const categories: PublicCatalogSummary["categories"] = {};
  const shops: PublicCatalogSummary["shops"] = {};
  const shopIds = new Set<string>();
  let deals = 0;
  let inStock = 0;
  let totalOffers = 0;
  let latestUpdate: string | null = null;

  for (const product of publicCatalog) {
    // "Active deal" everywhere means a real discount: old price above current.
    const hasDeal = productHasRealDeal(product);
    const hasStock = productHasStock(product);
    const categoryKeys = [...new Set([product.category?.id, product.category?.slug].filter(Boolean) as string[])];
    for (const categoryKey of categoryKeys) {
      categories[categoryKey] ??= { products: 0, deals: 0, inStock: 0 };
      categories[categoryKey].products += 1;
      if (hasDeal) categories[categoryKey].deals += 1;
      if (hasStock) categories[categoryKey].inStock += 1;
    }
    if (hasDeal) deals += 1;
    if (hasStock) inStock += 1;
    totalOffers += product.offers.length;

    const productShops = new Set<string>();
    const dealShops = new Set<string>();
    for (const offer of product.offers) {
      productShops.add(offer.shop.id);
      shopIds.add(offer.shop.id);
      if (offer.discountPercent > 0 && offer.oldPrice != null && offer.oldPrice > offer.currentPrice) dealShops.add(offer.shop.id);
      if (!latestUpdate || offer.lastSeenAt > latestUpdate) latestUpdate = offer.lastSeenAt;
    }
    for (const shopId of productShops) {
      shops[shopId] ??= { products: 0, deals: 0, latestUpdate: null };
      shops[shopId].products += 1;
    }
    for (const shopId of dealShops) shops[shopId].deals += 1;
    for (const offer of product.offers) {
      const entry = shops[offer.shop.id];
      if (entry && (!entry.latestUpdate || offer.lastSeenAt > entry.latestUpdate)) entry.latestUpdate = offer.lastSeenAt;
    }
  }

  return {
    categories,
    shops,
    stats: {
      shops: shopIds.size,
      products: publicCatalog.length,
      deals,
      inStock,
      outOfStock: publicCatalog.length - inStock,
      totalOffers,
      latestUpdate,
    },
  };
}

// Cross-request cache: the public summary (counts/stats/shops) is identical
// for every visitor and only changes when the catalog is re-scraped (daily).
// Caching it turns the per-request full-catalog scan that was timing routes
// out into a single scan per revalidation window.
const cachedPublicCatalogSummary = unstable_cache(
  loadPublicCatalogSummary,
  ["public-catalog-summary-v7"],
  { revalidate: 600, tags: ["catalog"] },
);

let pendingPublicCatalogSummary: Promise<PublicCatalogSummary> | null = null;

export async function getPublicCatalogSummary() {
  // In-flight de-dupe so concurrent sections of one render share one promise,
  // on top of the cross-request unstable_cache layer.
  if (pendingPublicCatalogSummary) return pendingPublicCatalogSummary;

  const request = cachedPublicCatalogSummary();
  pendingPublicCatalogSummary = request;
  try {
    return await request;
  } finally {
    if (pendingPublicCatalogSummary === request) pendingPublicCatalogSummary = null;
  }
}

function countGroupsByShop(groups: { shopId: string }[]) {
  const counts = new Map<string, number>();
  for (const group of groups) counts.set(group.shopId, (counts.get(group.shopId) ?? 0) + 1);
  return counts;
}

export async function listScrapeRuns(): Promise<ScrapeRunView[]> {
  if (!prisma) return scrapeRunFixtures;
  try {
    const runs = await prisma.scrapeRun.findMany({
      include: { shop: true },
      orderBy: { startedAt: "desc" },
      take: 30,
    });
    return runs.map((run) => ({
      id: run.id,
      shopName: run.shop?.name,
      shopSlug: run.shop?.slug,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
      pagesVisited: run.pagesVisited,
      offersSeen: run.offersSeen,
      errorLog: run.errorLog,
    }));
  } catch {
    return scrapeRunFixtures;
  }
}
