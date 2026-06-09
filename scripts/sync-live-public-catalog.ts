import "./load-env";
import { prisma } from "../src/lib/prisma";
import { findAdapter } from "../src/server/scrapers/shops";
import { scrapeShop } from "../src/server/scrapers/runner";

if (!prisma) throw new Error("DATABASE_URL is required.");
const db = prisma;

const PUBLIC_CATEGORIES = ["mobiles", "laptops"] as const;
type PublicCategory = (typeof PUBLIC_CATEGORIES)[number];

type Args = {
  apply: boolean;
  category?: PublicCategory;
  shop?: string;
  staleOnly: boolean;
};

type PublicOffer = {
  id: string;
  rawOfferId: string | null;
  shop: { slug: string };
  url: string;
  externalId: string | null;
  title: string;
  product: {
    categorySuggestedSlug: string | null;
    categoryNeedsReview: boolean;
    category: { slug: string } | null;
  };
};

function parseArgs(): Args {
  const args = new Map<string, string | boolean>();
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const [key, ...rest] = raw.slice(2).split("=");
    args.set(key, rest.length ? rest.join("=") : true);
  }

  const category = stringArg(args, "category");
  if (category && !PUBLIC_CATEGORIES.includes(category as PublicCategory)) {
    throw new Error(`Unsupported category "${category}". Use mobiles or laptops.`);
  }

  return {
    apply: Boolean(args.get("apply")),
    category: category as PublicCategory | undefined,
    shop: stringArg(args, "shop"),
    staleOnly: Boolean(args.get("stale-only")),
  };
}

function stringArg(args: Map<string, string | boolean>, key: string) {
  const value = args.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function productIdFromUrl(rawUrl: string) {
  try {
    const path = new URL(rawUrl).pathname;
    return path.match(/-p(\d+)(?:\/)?$/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function sourceKey(shop: string, rawUrl: string, externalId?: string | null) {
  if (shop === "ee" || shop === "zoommer") {
    return productIdFromUrl(rawUrl) ?? externalId ?? normalizePath(rawUrl);
  }
  return normalizePath(rawUrl);
}

function normalizePath(rawUrl: string) {
  const url = new URL(rawUrl);
  return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "").toLowerCase()}`;
}

function offerCategory(offer: PublicOffer) {
  if (!offer.product.categoryNeedsReview && offer.product.categorySuggestedSlug && PUBLIC_CATEGORIES.includes(offer.product.categorySuggestedSlug as PublicCategory)) {
    return offer.product.categorySuggestedSlug as PublicCategory;
  }
  return offer.product.category?.slug as PublicCategory | undefined;
}

async function publicOffers(shop: string, category: PublicCategory) {
  return db.productOffer.findMany({
    where: {
      shop: { slug: shop, enabled: true },
      currentPrice: { gt: 0 },
      matchStatus: "CONFIRMED",
      verificationStatus: "CONFIRMED",
      product: {
        isPublic: true,
        archivedAt: null,
        needsReview: false,
        categoryNeedsReview: false,
        OR: [
          { category: { slug: category } },
          { categorySuggestedSlug: category },
        ],
      },
    },
    select: {
      id: true,
      rawOfferId: true,
      url: true,
      externalId: true,
      title: true,
      shop: { select: { slug: true } },
      product: {
        select: {
          categorySuggestedSlug: true,
          categoryNeedsReview: true,
          category: { select: { slug: true } },
        },
      },
    },
  });
}

async function syncOne(shop: string, category: PublicCategory, options: Pick<Args, "apply" | "staleOnly">) {
  const adapter = findAdapter(shop);
  if (!adapter?.listProductUrls) throw new Error(`Shop adapter "${shop}" does not support product URL discovery.`);
  const liveUrls = await adapter.listProductUrls(category);
  const liveByKey = new Map<string, string>();
  for (const url of liveUrls) liveByKey.set(sourceKey(shop, url), url);

  const offers = (await publicOffers(shop, category)).filter((offer) => offerCategory(offer) === category);
  const publicByKey = new Map<string, PublicOffer>();
  for (const offer of offers) publicByKey.set(sourceKey(shop, offer.url, offer.externalId), offer);

  const missing = [...liveByKey.entries()]
    .filter(([key]) => !publicByKey.has(key))
    .map(([key, url]) => ({ key, url }));
  const stale = [...publicByKey.entries()]
    .filter(([key]) => !liveByKey.has(key))
    .map(([key, offer]) => ({ key, offer }));

  console.log(`${shop}:${category} live=${liveByKey.size} public=${publicByKey.size} missing=${missing.length} stale=${stale.length}`);
  for (const item of missing.slice(0, 12)) console.log(`  missing ${item.key} ${item.url}`);
  if (missing.length > 12) console.log(`  ...${missing.length - 12} more missing`);
  for (const item of stale.slice(0, 12)) console.log(`  stale ${item.key} ${item.offer.url}`);
  if (stale.length > 12) console.log(`  ...${stale.length - 12} more stale`);

  if (!options.apply) return { shop, category, live: liveByKey.size, public: publicByKey.size, missing: missing.length, stale: stale.length };

  let staleOffersUpdated = 0;
  let staleRawUpdated = 0;
  if (stale.length) {
    const staleOfferIds = stale.map((item) => item.offer.id);
    const staleRawOfferIds = stale.map((item) => item.offer.rawOfferId).filter((id): id is string => Boolean(id));
    staleOffersUpdated = (await db.productOffer.updateMany({
      where: { id: { in: staleOfferIds } },
      data: {
        matchStatus: "REJECTED",
        verificationStatus: "REJECTED",
        availability: "OUT_OF_STOCK",
        lastCheckedAt: new Date(),
      },
    })).count;
    if (staleRawOfferIds.length) {
      staleRawUpdated = (await db.rawOffer.updateMany({
        where: { id: { in: staleRawOfferIds } },
        data: {
          status: "EXCLUDED",
          errorMessage: "Excluded by live catalog sync: URL is no longer present in the store category source.",
          processedAt: new Date(),
        },
      })).count;
    }
  }

  if (options.staleOnly) {
    return {
      shop,
      category,
      live: liveByKey.size,
      public: publicByKey.size,
      missing: missing.length,
      stale: stale.length,
      imported: 0,
      importFailed: 0,
      staleOffersUpdated,
      staleRawUpdated,
    };
  }

  process.env.SCRAPER_ENABLED = "true";
  const importBatchId = `live-sync:${shop}:${category}:${Date.now()}`;
  let imported = 0;
  let importFailed = 0;
  for (const item of missing) {
    try {
      const run = await scrapeShop(shop, {
        category,
        rawOnly: true,
        importBatchId,
        limit: 1,
        url: item.url,
      });
      const offersSeen = ("offersSeen" in run ? run.offersSeen : 0) ?? 0;
      if (offersSeen > 0) imported += 1;
      else importFailed += 1;
    } catch (error) {
      importFailed += 1;
      console.log(`  import failed ${item.url}: ${error instanceof Error ? error.message : error}`);
    }
  }

  return {
    shop,
    category,
    live: liveByKey.size,
    public: publicByKey.size,
    missing: missing.length,
    stale: stale.length,
    imported,
    importFailed,
    staleOffersUpdated,
    staleRawUpdated,
  };
}

async function main() {
  const args = parseArgs();
  const shops = args.shop ? [args.shop] : ["pcshop", "ee", "zoommer"];
  const categories = args.category ? [args.category] : [...PUBLIC_CATEGORIES];
  const results = [];

  for (const shop of shops) {
    for (const category of categories) {
      results.push(await syncOne(shop, category, args));
    }
  }

  console.log(JSON.stringify({ apply: args.apply, results }, null, 2));
}

main()
  .finally(async () => db.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
