import * as cheerio from "cheerio";
import { OfferAvailability, Prisma, ScrapeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeProductName, slugifyProduct } from "@/lib/matching";
import { categorizeProduct } from "@/lib/categorizeProduct";
import { extractProductIdentity, mergeProductIdentities, readProductIdentity } from "@/lib/productIdentity";
import { normalizeProductTitle, removeNoiseWords } from "@/lib/productNormalization";
import { explainMatchDecision } from "@/lib/productMatching";
import { findAdapter } from "@/server/scrapers/shops";
import { robotsAllows, robotsPolicy } from "@/server/scrapers/robots";
import { ScrapedOffer, ShopAdapter } from "@/server/scrapers/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";
const DEFAULT_MAX_PRODUCTS_PER_SHOP = 120;
const categoryIdBySlug = new Map<string, string | null>();

export type ScrapeBatchOptions = {
  category?: string;
  dryRun?: boolean;
  importBatchId?: string;
  limit?: number;
  offset?: number;
  rawOnly?: boolean;
  url?: string;
};

function discountPercent(price: number, oldPrice?: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function safeDelayMs(baseRateLimitMs: number, robotsDelayMs?: number) {
  const base = Math.max(baseRateLimitMs, robotsDelayMs ?? 0);
  const jitter = Math.floor(Math.random() * Math.max(300, Math.floor(base * 0.2)));
  return base + jitter;
}

function resolveMaxProductsPerRun(adapter: ShopAdapter, options: ScrapeBatchOptions = {}) {
  const shopLimitKey = `SCRAPER_${adapter.slug.replace(/-/g, "_").toUpperCase()}_MAX_PRODUCTS_PER_RUN`;
  const shopLimit = Number.parseInt(process.env[shopLimitKey] ?? "", 10);
  const envLimit = Number.parseInt(process.env.SCRAPER_MAX_PRODUCTS_PER_SHOP ?? "", 10);
  if (options.limit && options.limit > 0) return options.limit;
  if (Number.isFinite(shopLimit) && shopLimit > 0) return shopLimit;
  if (adapter.maxProductsPerRun && adapter.maxProductsPerRun > 0) return adapter.maxProductsPerRun;
  if (Number.isFinite(envLimit) && envLimit > 0) return envLimit;
  return DEFAULT_MAX_PRODUCTS_PER_SHOP;
}

function resolveOffset(options: ScrapeBatchOptions = {}) {
  const envOffset = Number.parseInt(process.env.SCRAPER_OFFSET ?? "", 10);
  if (options.offset && options.offset > 0) return options.offset;
  return Number.isFinite(envOffset) && envOffset > 0 ? envOffset : 0;
}

function canScrapeByCategory(adapter: ShopAdapter) {
  return Boolean(adapter.parseDocument && adapter.categoryUrls && Object.keys(adapter.categoryUrls).length > 0);
}

function canScrapeByProductUrls(adapter: ShopAdapter) {
  return Boolean(adapter.listProductUrls && adapter.parseProductPage);
}

async function categoryIdForSlug(slug?: string) {
  if (!prisma || !slug) return null;
  if (categoryIdBySlug.has(slug)) return categoryIdBySlug.get(slug) ?? null;
  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  categoryIdBySlug.set(slug, category?.id ?? null);
  return category?.id ?? null;
}

async function findOrCreateProduct(offer: ScrapedOffer) {
  if (!prisma) throw new Error("DATABASE_URL is required for scraping.");
  const normalizedName = normalizeProductName(offer.title);
  const categoryDecision = categorizeProduct({
    title: offer.title,
    description: offer.description,
    scrapedShopCategory: offer.categorySlug,
    breadcrumbs: offer.breadcrumbs ?? [offer.url],
    brand: offer.brand,
    model: offer.model,
    imageAlt: offer.imageAlt,
  });
  const categoryId = await categoryIdForSlug(categoryDecision.publicCategorySlug);
  const identity = extractProductIdentity({
    title: offer.title,
    description: offer.description,
    brand: offer.brand,
    model: offer.model,
    categorySlug: categoryDecision.publicCategorySlug,
    breadcrumbs: offer.breadcrumbs,
  });
  const candidates = await prisma.product.findMany({
    where: identity.canonicalKey
      ? {
          OR: [
            { canonicalKey: identity.canonicalKey },
            { normalizedName: { contains: identity.model?.replaceAll("_", " ") ?? normalizedName.split(" ")[0] } },
          ],
        }
      : { normalizedName: { contains: identity.model?.replaceAll("_", " ") ?? normalizedName.split(" ")[0] } },
    take: 30,
  });
  const confirmed = candidates
    .map((product) => ({
      product,
      decision: explainMatchDecision(
        readProductIdentity(product.productIdentity) ?? { title: product.name, brand: product.brand, model: product.model, categorySlug: categoryDecision.publicCategorySlug },
        identity,
      ),
    }))
    .find(({ decision }) => decision.status === "CONFIRMED");
  const match = confirmed?.product;
  if (match) {
    const update: Prisma.ProductUncheckedUpdateInput = {};
    const storedIdentity = readProductIdentity(match.productIdentity);
    const mergedIdentity = storedIdentity ? mergeProductIdentities(storedIdentity, identity) : identity;
    if (!match.categoryLocked && !match.manualCategoryId && categoryId && match.categoryId !== categoryId) update.categoryId = categoryId;
    if (!match.categoryLocked && !match.manualCategoryId) Object.assign(update, categoryDecisionData(categoryDecision, offer));
    if (mergedIdentity.canonicalKey && match.canonicalKey !== mergedIdentity.canonicalKey) update.canonicalKey = mergedIdentity.canonicalKey;
    update.productIdentity = jsonValue(mergedIdentity);
    update.missingOfferDiscoveryStatus = "PENDING";
    if (!match.imageUrl && offer.imageUrl) update.imageUrl = offer.imageUrl;
    if (!match.brand && offer.brand) update.brand = offer.brand;
    if (!match.model && offer.model) update.model = offer.model;
    const product = Object.keys(update).length ? await prisma.product.update({ where: { id: match.id }, data: update }) : match;
    return { product, identity, matchConfidence: confirmed!.decision.confidence };
  }

  const slugBase = slugifyProduct(offer.title);

  const product = await prisma.product.create({
    data: {
      name: offer.title,
      normalizedName,
      slug: `${slugBase}-${crypto.randomUUID().slice(0, 6)}`,
      canonicalKey: identity.canonicalKey,
      productIdentity: jsonValue(identity),
      brand: offer.brand,
      model: offer.model,
      imageUrl: offer.imageUrl,
      categoryId,
      ...categoryDecisionData(categoryDecision, offer),
    },
  });
  return { product, identity, matchConfidence: 100 };
}

function categoryDecisionData(decision: ReturnType<typeof categorizeProduct>, offer: ScrapedOffer) {
  return {
    categoryConfidence: decision.confidenceScore,
    categoryNeedsReview: decision.needsReview,
    categorySuggestedSlug: decision.publicCategorySlug,
    categoryReason: decision.reason,
    categoryMatchedRules: decision.matchedRules,
    categorySourceSignals: {
      scrapedShopCategory: offer.categorySlug ?? null,
      breadcrumbs: offer.breadcrumbs ?? [],
      sourceTitle: offer.title,
    },
  };
}

async function saveOffer(shopId: string, scraped: ScrapedOffer, options: Pick<ScrapeBatchOptions, "dryRun" | "importBatchId" | "rawOnly"> = {}) {
  if (!prisma) throw new Error("DATABASE_URL is required for scraping.");
  if (options.dryRun) return { created: 0, updated: 0, skipped: 1 };
  const rawOffer = await saveRawOffer(shopId, scraped, options.importBatchId);
  if (options.rawOnly) {
    return { created: 0, updated: 1, skipped: 0 };
  }
  const match = await findOrCreateProduct(scraped);
  const product = match.product;
  const existing = await prisma.productOffer.findUnique({
    where: { shopId_url: { shopId, url: scraped.url } },
  });
  const changed = existing ? Number(existing.currentPrice) !== scraped.price : true;

  const offer = await prisma.productOffer.upsert({
    where: { shopId_url: { shopId, url: scraped.url } },
    update: {
      productId: product.id,
      rawOfferId: rawOffer.id,
      externalId: scraped.externalId,
      title: scraped.title,
      canonicalKey: match.identity.canonicalKey,
      productIdentity: jsonValue(match.identity),
      matchStatus: "CONFIRMED",
      matchConfidence: match.matchConfidence,
      verificationStatus: "CONFIRMED",
      currentPrice: scraped.price,
      oldPrice: scraped.oldPrice,
      discountPercent: discountPercent(scraped.price, scraped.oldPrice),
      availability: scraped.availability as OfferAvailability,
      imageUrl: scraped.imageUrl,
      lastSeenAt: new Date(),
      lastPriceChangedAt: changed ? new Date() : existing?.lastPriceChangedAt,
    },
    create: {
      shopId,
      productId: product.id,
      rawOfferId: rawOffer.id,
      externalId: scraped.externalId,
      url: scraped.url,
      title: scraped.title,
      canonicalKey: match.identity.canonicalKey,
      productIdentity: jsonValue(match.identity),
      matchStatus: "CONFIRMED",
      matchConfidence: match.matchConfidence,
      verificationStatus: "CONFIRMED",
      currentPrice: scraped.price,
      oldPrice: scraped.oldPrice,
      discountPercent: discountPercent(scraped.price, scraped.oldPrice),
      availability: scraped.availability as OfferAvailability,
      imageUrl: scraped.imageUrl,
      lastPriceChangedAt: new Date(),
    },
  });

  if (changed) {
    await prisma.priceHistory.create({
      data: { offerId: offer.id, price: scraped.price, oldPrice: scraped.oldPrice },
    });
  }

  await prisma.rawOffer.update({
    where: { id: rawOffer.id },
    data: {
      productId: product.id,
      status: "ATTACHED",
      processedAt: new Date(),
    },
  });

  return { created: existing ? 0 : 1, updated: existing ? 1 : 0, skipped: 0 };
}

export async function saveRawOffer(shopId: string, scraped: ScrapedOffer, importBatchId?: string) {
  if (!prisma) throw new Error("DATABASE_URL is required for scraping.");
  const categoryDecision = categorizeProduct({
    title: scraped.title,
    description: scraped.description,
    scrapedShopCategory: scraped.categorySlug,
    breadcrumbs: scraped.breadcrumbs ?? [scraped.url],
    brand: scraped.brand,
    model: scraped.model,
    imageAlt: scraped.imageAlt,
  });
  const identity = extractProductIdentity({
    title: scraped.title,
    description: scraped.description,
    brand: scraped.brand,
    model: scraped.model,
    categorySlug: categoryDecision.publicCategorySlug,
    breadcrumbs: scraped.breadcrumbs,
  });
  return prisma.rawOffer.upsert({
    where: { shopId_originalUrl: { shopId, originalUrl: scraped.url } },
    update: {
      externalId: scraped.externalId,
      originalTitle: scraped.title,
      originalImageUrl: scraped.imageUrl,
      rawPrice: scraped.price,
      rawOldPrice: scraped.oldPrice,
      rawDiscount: discountPercent(scraped.price, scraped.oldPrice),
      availability: scraped.availability as OfferAvailability,
      rawCategory: scraped.categorySlug,
      sourceCategory: scraped.categorySlug,
      breadcrumbs: jsonValue(scraped.breadcrumbs ?? []),
      sourceBreadcrumbs: jsonValue(scraped.breadcrumbs ?? []),
      description: scraped.description,
      imageAlt: scraped.imageAlt,
      rawSpecsJson: jsonValue({}),
      importBatchId,
      brand: scraped.brand,
      model: scraped.model,
      normalizedTitle: normalizeProductTitle(scraped.title),
      cleanTitle: removeNoiseWords(scraped.title),
      canonicalKey: identity.canonicalKey,
      productIdentity: jsonValue(identity),
      categorySlug: categoryDecision.publicCategorySlug,
      categoryConfidence: categoryDecision.confidenceScore,
      categoryNeedsReview: categoryDecision.needsReview,
      status: categoryDecision.needsReview ? "NEEDS_REVIEW" : "NORMALIZED",
      scrapedAt: new Date(),
    },
    create: {
      shopId,
      externalId: scraped.externalId,
      originalTitle: scraped.title,
      originalUrl: scraped.url,
      originalImageUrl: scraped.imageUrl,
      rawPrice: scraped.price,
      rawOldPrice: scraped.oldPrice,
      rawDiscount: discountPercent(scraped.price, scraped.oldPrice),
      availability: scraped.availability as OfferAvailability,
      rawCategory: scraped.categorySlug,
      sourceCategory: scraped.categorySlug,
      breadcrumbs: jsonValue(scraped.breadcrumbs ?? []),
      sourceBreadcrumbs: jsonValue(scraped.breadcrumbs ?? []),
      description: scraped.description,
      imageAlt: scraped.imageAlt,
      rawSpecsJson: jsonValue({}),
      importBatchId,
      brand: scraped.brand,
      model: scraped.model,
      normalizedTitle: normalizeProductTitle(scraped.title),
      cleanTitle: removeNoiseWords(scraped.title),
      canonicalKey: identity.canonicalKey,
      productIdentity: jsonValue(identity),
      categorySlug: categoryDecision.publicCategorySlug,
      categoryConfidence: categoryDecision.confidenceScore,
      categoryNeedsReview: categoryDecision.needsReview,
      status: categoryDecision.needsReview ? "NEEDS_REVIEW" : "NORMALIZED",
    },
  });
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function scrapeCategoryMode(shopId: string, adapter: ShopAdapter, userAgent: string, errors: string[], options: ScrapeBatchOptions = {}) {
  const policy = await robotsPolicy(adapter.baseUrl);
  let pagesVisited = 0;
  let offersSeen = 0;
  let offersCreated = 0;
  let offersUpdated = 0;
  let offersSkipped = 0;
  let skippedByOffset = 0;
  const offset = resolveOffset(options);
  const limit = resolveMaxProductsPerRun(adapter, options);

  const categoryEntries = options.url
    ? [[options.category ?? "other", [validatedTargetUrl(adapter, options.url)]]] as Array<[string, string[]]>
    : Object.entries(adapter.categoryUrls ?? {});

  for (const [categorySlug, urls] of categoryEntries) {
    if (options.category && categorySlug !== options.category) continue;
    for (const path of urls) {
      const url = new URL(path, adapter.baseUrl);
      if (!robotsAllows(url, policy)) {
        errors.push(`robots.txt blocked ${url.pathname}`);
        continue;
      }

      try {
        await sleep(safeDelayMs(adapter.rateLimitMs, policy.crawlDelayMs));
        const response = await fetch(url, {
          headers: { "user-agent": userAgent },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

        const html = await response.text();
        const offers = adapter.parseDocument?.(cheerio.load(html), categorySlug) ?? [];
        for (const offer of offers) {
          if (skippedByOffset < offset) {
            skippedByOffset += 1;
            continue;
          }
          if (offersSeen >= limit) return { pagesVisited, offersSeen, offersCreated, offersUpdated, offersSkipped };
          const result = await saveOffer(shopId, offer, options);
          offersCreated += result.created;
          offersUpdated += result.updated;
          offersSkipped += result.skipped;
          offersSeen += 1;
        }
        pagesVisited += 1;
      } catch (error) {
        errors.push(`${url.pathname}: ${error instanceof Error ? error.message : "Unknown scrape error"}`);
      }
    }
  }

  return { pagesVisited, offersSeen, offersCreated, offersUpdated, offersSkipped };
}

async function scrapeProductMode(shopId: string, adapter: ShopAdapter, userAgent: string, errors: string[], options: ScrapeBatchOptions = {}) {
  const policy = await robotsPolicy(adapter.baseUrl);
  const targets = options.url
    ? [validatedTargetUrl(adapter, options.url)]
    : await selectProductTargets(
        shopId,
        (await adapter.listProductUrls?.(options.category)) ?? [],
        resolveMaxProductsPerRun(adapter, options),
        resolveOffset(options),
        options.limit !== undefined || options.offset !== undefined,
      );
  let pagesVisited = 0;
  let offersSeen = 0;
  let offersCreated = 0;
  let offersUpdated = 0;
  let offersSkipped = 0;

  for (const rawUrl of targets) {
    const url = new URL(rawUrl, adapter.baseUrl);
    if (!robotsAllows(url, policy)) {
      errors.push(`robots.txt blocked ${url.pathname}`);
      continue;
    }

    try {
      await sleep(safeDelayMs(adapter.rateLimitMs, policy.crawlDelayMs));
      const response = await fetch(url, {
        headers: { "user-agent": userAgent },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

      const html = await response.text();
      const offer = adapter.parseProductPage?.({ $: cheerio.load(html), html, url });
      pagesVisited += 1;

      if (!offer || !offer.title || offer.price <= 0) continue;
      const result = await saveOffer(shopId, offer, options);
      offersCreated += result.created;
      offersUpdated += result.updated;
      offersSkipped += result.skipped;
      offersSeen += 1;
    } catch (error) {
      errors.push(`${url.pathname}: ${error instanceof Error ? error.message : "Unknown scrape error"}`);
    }
  }

  return { pagesVisited, offersSeen, offersCreated, offersUpdated, offersSkipped };
}

function validatedTargetUrl(adapter: ShopAdapter, rawUrl: string) {
  const target = new URL(rawUrl, adapter.baseUrl);
  const base = new URL(adapter.baseUrl);
  if (target.origin !== base.origin) throw new Error(`Target URL must belong to ${base.origin}.`);
  return target.toString();
}

async function selectProductTargets(shopId: string, discovered: string[], limit: number, offset = 0, stableBatch = false) {
  if (!prisma) throw new Error("DATABASE_URL is required for scraping.");
  const uniqueUrls = [...new Set(discovered)];
  if (stableBatch) return uniqueUrls.slice(offset, offset + limit);
  const existing = await prisma.productOffer.findMany({
    where: { shopId },
    select: { url: true, lastSeenAt: true },
  });
  const seenAtByUrl = new Map(existing.map((offer) => [offer.url, offer.lastSeenAt.getTime()]));

  return uniqueUrls
    .map((url, index) => ({ url, index, lastSeenAt: seenAtByUrl.get(url) }))
    .sort((left, right) => {
      if (left.lastSeenAt == null && right.lastSeenAt != null) return -1;
      if (left.lastSeenAt != null && right.lastSeenAt == null) return 1;
      if (left.lastSeenAt != null && right.lastSeenAt != null && left.lastSeenAt !== right.lastSeenAt) {
        return left.lastSeenAt - right.lastSeenAt;
      }
      return left.index - right.index;
    })
    .slice(offset, offset + limit)
    .map((entry) => entry.url);
}

export async function scrapeShop(slug: string, options: ScrapeBatchOptions = {}) {
  const adapter = findAdapter(slug);
  if (!adapter) throw new Error(`Unknown shop adapter: ${slug}`);
  if (!prisma && !options.dryRun) throw new Error("DATABASE_URL is required for scraping.");
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;

  const shop = options.dryRun
    ? null
    : await prisma!.shop.upsert({
        where: { slug: adapter.slug },
        update: {
          name: adapter.name,
          baseUrl: adapter.baseUrl,
          needsConfiguration: adapter.needsConfiguration,
        },
        create: {
          slug: adapter.slug,
          name: adapter.name,
          baseUrl: adapter.baseUrl,
          enabled: adapter.enabledByDefault,
          needsConfiguration: adapter.needsConfiguration,
        },
      });
  const effectiveShop = shop ?? {
    id: adapter.slug,
    enabled: options.dryRun ? true : adapter.enabledByDefault,
  };
  const run = options.dryRun
    ? null
    : await prisma!.scrapeRun.create({
        data: { shopId: effectiveShop.id, status: ScrapeStatus.RUNNING },
      });
  const errors: string[] = [];
  let pagesVisited = 0;
  let offersSeen = 0;
  let offersCreated = 0;
  let offersUpdated = 0;
  let offersSkipped = 0;

  if (!effectiveShop.enabled || adapter.needsConfiguration || process.env.SCRAPER_ENABLED !== "true") {
      const data = {
        status: ScrapeStatus.SKIPPED,
        finishedAt: new Date(),
        errorLog: [
          !effectiveShop.enabled ? "Shop is disabled." : null,
          adapter.needsConfiguration ? "Adapter needs selector/API configuration." : null,
          process.env.SCRAPER_ENABLED !== "true" ? "SCRAPER_ENABLED is not true." : null,
        ].filter(Boolean),
      };
    if (!options.dryRun && shop) {
      await prisma!.shop.update({
        where: { id: effectiveShop.id },
        data: { ingestionStatus: "SKIPPED" },
      });
    }
    return run ? prisma!.scrapeRun.update({ where: { id: run.id }, data }) : { ...data, pagesVisited: 0, offersSeen: 0, dryRun: true };
  }

  if (options.category && adapter.preferProductUrlsForCategory && canScrapeByProductUrls(adapter)) {
    const result = await scrapeProductMode(effectiveShop.id, adapter, userAgent, errors, options);
    pagesVisited = result.pagesVisited;
    offersSeen = result.offersSeen;
    offersCreated = result.offersCreated;
    offersUpdated = result.offersUpdated;
    offersSkipped = result.offersSkipped;
  } else if ((options.category || options.url) && canScrapeByCategory(adapter)) {
    const result = await scrapeCategoryMode(effectiveShop.id, adapter, userAgent, errors, options);
    pagesVisited = result.pagesVisited;
    offersSeen = result.offersSeen;
    offersCreated = result.offersCreated;
    offersUpdated = result.offersUpdated;
    offersSkipped = result.offersSkipped;
  } else if (canScrapeByProductUrls(adapter)) {
    const result = await scrapeProductMode(effectiveShop.id, adapter, userAgent, errors, options);
    pagesVisited = result.pagesVisited;
    offersSeen = result.offersSeen;
    offersCreated = result.offersCreated;
    offersUpdated = result.offersUpdated;
    offersSkipped = result.offersSkipped;
  } else if (canScrapeByCategory(adapter)) {
    const result = await scrapeCategoryMode(effectiveShop.id, adapter, userAgent, errors, options);
    pagesVisited = result.pagesVisited;
    offersSeen = result.offersSeen;
    offersCreated = result.offersCreated;
    offersUpdated = result.offersUpdated;
    offersSkipped = result.offersSkipped;
  } else {
    errors.push("Adapter has no scrape strategy configured.");
  }

  if (options.dryRun) {
    return {
      status: errors.length && offersSeen ? ScrapeStatus.PARTIAL : errors.length ? ScrapeStatus.FAILED : ScrapeStatus.SUCCESS,
      pagesVisited,
      offersSeen,
      offersCreated,
      offersUpdated,
      offersSkipped,
      finishedAt: new Date(),
      errorLog: errors.length ? errors : undefined,
      dryRun: true,
    };
  }

  await prisma!.shop.update({
    where: { id: effectiveShop.id },
    data: {
      lastScrapedAt: new Date(),
      lastIngestedAt: new Date(),
      ingestionStatus: errors.length && offersSeen ? "PARTIAL" : errors.length ? "FAILED" : "SUCCESS",
    },
  });
  const updatedRun = await prisma!.scrapeRun.update({
    where: { id: run!.id },
    data: {
      pagesVisited,
      offersSeen,
      finishedAt: new Date(),
      errorLog: errors.length ? errors : undefined,
      status: errors.length && offersSeen ? ScrapeStatus.PARTIAL : errors.length ? ScrapeStatus.FAILED : ScrapeStatus.SUCCESS,
    },
  });
  return { ...updatedRun, offersCreated, offersUpdated, offersSkipped };
}
