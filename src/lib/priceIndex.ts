import { unstable_cache } from "next/cache";
import { PUBLIC_CATEGORY_TAXONOMY, PUBLIC_CATEGORY_SLUGS, isPublicCategorySlug } from "@/config/categoryMapping";
import { prisma } from "@/lib/prisma";
import { prettifyProductName } from "@/lib/productDisplay";

// The Price Index: a matched-basket, CPI-style read on how Georgian retail
// prices moved over the last week. For every public offer we compare its
// current price to the most recent price recorded at least WINDOW_DAYS ago
// (from PriceHistory) and average the per-offer % change within each category.
// Because the same listing is compared to its own past price, the index is not
// skewed by which products happen to be in the catalog this week (composition
// bias) — unlike a naive "average catalog price" comparison.

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;
// Beyond this the "as-of" reference price is too old to call a 7-day move.
const HISTORY_LOOKBACK_DAYS = 21;
// Guard against scrape/data errors (e.g. a price field of 1) dominating the mean.
const MAX_ABS_PCT = 60;
const MOVER_MAX_ABS_PCT = 70;
const MOVERS_PER_SIDE = 8;
// A move smaller than this is treated as "flat" for the drop/rise tallies.
const FLAT_THRESHOLD_PCT = 0.5;

export type CategoryIndex = {
  slug: string;
  nameKa: string;
  changePct: number;
  sampleSize: number;
  drops: number;
  rises: number;
};

export type IndexMover = {
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  categorySlug: string | null;
  shopName: string;
  priceNow: number;
  priceThen: number;
  changePct: number;
};

export type PriceIndex = {
  generatedAt: string;
  windowDays: number;
  overall: { changePct: number; sampleSize: number; drops: number; rises: number };
  categories: CategoryIndex[];
  topDrops: IndexMover[];
  topRises: IndexMover[];
};

const EMPTY_INDEX: PriceIndex = {
  generatedAt: new Date(0).toISOString(),
  windowDays: WINDOW_DAYS,
  overall: { changePct: 0, sampleSize: 0, drops: 0, rises: 0 },
  categories: [],
  topDrops: [],
  topRises: [],
};

function categoryNameKa(slug: string): string {
  if (isPublicCategorySlug(slug)) {
    return PUBLIC_CATEGORY_TAXONOMY[slug as keyof typeof PUBLIC_CATEGORY_TAXONOMY]?.nameKa ?? slug;
  }
  return slug;
}

type Sample = {
  changePct: number;
  offerId: string;
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  categorySlug: string;
  shopName: string;
  priceNow: number;
  priceThen: number;
};

async function computePriceIndex(): Promise<PriceIndex> {
  if (!prisma) return EMPTY_INDEX;
  try {
    const now = Date.now();
    const asOf = new Date(now - WINDOW_DAYS * DAY);
    const historyFloor = new Date(now - HISTORY_LOOKBACK_DAYS * DAY);

    const offers = await prisma.productOffer.findMany({
      where: {
        shop: { enabled: true },
        currentPrice: { gt: 0 },
        isActive: true,
        matchStatus: { in: ["CONFIRMED", "SAFE_AUTO", "CANONICAL_CREATED"] },
        verificationStatus: "CONFIRMED",
        product: {
          isPublic: true,
          archivedAt: null,
          needsReview: false,
          OR: [
            { category: { slug: { in: [...PUBLIC_CATEGORY_SLUGS] } } },
            { categorySuggestedSlug: { in: [...PUBLIC_CATEGORY_SLUGS] } },
          ],
        },
      },
      select: {
        id: true,
        currentPrice: true,
        imageUrl: true,
        shop: { select: { name: true } },
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
    if (!offers.length) return EMPTY_INDEX;

    const offerIds = offers.map((offer) => offer.id);
    // One query for the reference prices; keep it cheap by batching offer ids.
    const history = await prisma.priceHistory.findMany({
      where: { offerId: { in: offerIds }, capturedAt: { gte: historyFloor, lte: asOf } },
      select: { offerId: true, price: true },
      orderBy: { capturedAt: "asc" },
    });
    // Ascending capture order → last write per offer is the latest price <= asOf.
    const priceThenByOffer = new Map<string, number>();
    for (const row of history) priceThenByOffer.set(row.offerId, Number(row.price));

    const samples: Sample[] = [];
    for (const offer of offers) {
      const priceThen = priceThenByOffer.get(offer.id);
      const priceNow = Number(offer.currentPrice);
      if (!priceThen || priceThen <= 0 || priceNow <= 0) continue;
      const changePct = ((priceNow - priceThen) / priceThen) * 100;
      if (!Number.isFinite(changePct) || Math.abs(changePct) > MOVER_MAX_ABS_PCT) continue;
      const categorySlug = offer.product.category?.slug ?? offer.product.categorySuggestedSlug;
      if (!categorySlug || !isPublicCategorySlug(categorySlug)) continue;
      samples.push({
        changePct,
        offerId: offer.id,
        productId: offer.product.id,
        productSlug: offer.product.slug,
        productName: prettifyProductName(offer.product.name),
        imageUrl: offer.imageUrl ?? offer.product.imageUrl,
        categorySlug,
        shopName: offer.shop.name,
        priceNow,
        priceThen,
      });
    }
    if (!samples.length) return EMPTY_INDEX;

    // Index aggregation winsorizes larger moves so a single bad row can't swing
    // the mean; movers below use the wider MOVER_MAX_ABS_PCT bound.
    const indexSamples = samples.filter((sample) => Math.abs(sample.changePct) <= MAX_ABS_PCT);
    const byCategory = new Map<string, number[]>();
    for (const sample of indexSamples) {
      if (!byCategory.has(sample.categorySlug)) byCategory.set(sample.categorySlug, []);
      byCategory.get(sample.categorySlug)!.push(sample.changePct);
    }

    const summarize = (values: number[]) => {
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      const drops = values.filter((value) => value < -FLAT_THRESHOLD_PCT).length;
      const rises = values.filter((value) => value > FLAT_THRESHOLD_PCT).length;
      return { changePct: Number(avg.toFixed(2)), sampleSize: values.length, drops, rises };
    };

    const categories: CategoryIndex[] = [...byCategory.entries()]
      .map(([slug, values]) => ({ slug, nameKa: categoryNameKa(slug), ...summarize(values) }))
      .sort((a, b) => b.sampleSize - a.sampleSize);

    const allValues = indexSamples.map((sample) => sample.changePct);
    const overall = summarize(allValues);

    // Movers: biggest verified moves, one per product (cheapest-shown offer wins
    // since offers are already ordered by the query's default; dedupe by product).
    const dedupeByProduct = (list: Sample[]) => {
      const seen = new Set<string>();
      const out: IndexMover[] = [];
      for (const sample of list) {
        if (seen.has(sample.productId)) continue;
        seen.add(sample.productId);
        out.push({
          productSlug: sample.productSlug,
          productName: sample.productName,
          imageUrl: sample.imageUrl,
          categorySlug: sample.categorySlug,
          shopName: sample.shopName,
          priceNow: sample.priceNow,
          priceThen: sample.priceThen,
          changePct: Number(sample.changePct.toFixed(1)),
        });
        if (out.length >= MOVERS_PER_SIDE) break;
      }
      return out;
    };

    const topDrops = dedupeByProduct([...samples].filter((s) => s.changePct < -FLAT_THRESHOLD_PCT).sort((a, b) => a.changePct - b.changePct));
    const topRises = dedupeByProduct([...samples].filter((s) => s.changePct > FLAT_THRESHOLD_PCT).sort((a, b) => b.changePct - a.changePct));

    return {
      generatedAt: new Date().toISOString(),
      windowDays: WINDOW_DAYS,
      overall,
      categories,
      topDrops,
      topRises,
    };
  } catch {
    return EMPTY_INDEX;
  }
}

const cachedPriceIndex = unstable_cache(computePriceIndex, ["price-index-v1"], {
  revalidate: 1800,
  tags: ["catalog"],
});

export async function getPriceIndex(): Promise<PriceIndex> {
  return cachedPriceIndex();
}
