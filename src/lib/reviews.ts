// Visitor reviews of the site — read side.
//
// There is no account system here on purpose: the feature is "say something
// without signing up". The shared validation rules live in lib/review-rules.ts
// so the client form can import them without pulling prisma (and therefore the
// `pg` driver) into the browser bundle.
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { REVIEWS_PAGE_SIZE, REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "@/lib/review-rules";

export type PublicReview = {
  id: string;
  authorName: string | null;
  rating: number;
  body: string;
  reply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
};

export type ReviewSummary = {
  reviews: PublicReview[];
  total: number;
  average: number;
  /** Count per rating, index 0 = 1 star. */
  distribution: number[];
};

// What actually crosses the cache boundary. unstable_cache stores JSON, so a
// Date goes in and an ISO *string* comes back — the TypeScript type lies about
// it and the mismatch only shows up at runtime (`createdAt.toISOString is not a
// function`). Serialising deliberately, and rehydrating on the way out, makes
// the round trip honest.
type CachedReview = Omit<PublicReview, "createdAt" | "repliedAt"> & {
  createdAt: string;
  repliedAt: string | null;
};
type CachedSummary = Omit<ReviewSummary, "reviews"> & { reviews: CachedReview[] };

const EMPTY_SUMMARY: CachedSummary = { reviews: [], total: 0, average: 0, distribution: [0, 0, 0, 0, 0] };

async function loadReviewSummary(): Promise<CachedSummary> {
  if (!prisma) return EMPTY_SUMMARY;
  try {
    const [reviews, grouped] = await Promise.all([
      prisma.siteReview.findMany({
        where: { hidden: false },
        select: { id: true, authorName: true, rating: true, body: true, reply: true, repliedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: REVIEWS_PAGE_SIZE,
      }),
      prisma.siteReview.groupBy({
        by: ["rating"],
        where: { hidden: false },
        _count: { _all: true },
      }),
    ]);

    const distribution = [0, 0, 0, 0, 0];
    let total = 0;
    let sum = 0;
    for (const row of grouped) {
      const count = row._count._all;
      const index = Math.min(Math.max(row.rating, REVIEW_RATING_MIN), REVIEW_RATING_MAX) - 1;
      distribution[index] += count;
      total += count;
      sum += row.rating * count;
    }

    return {
      reviews: reviews.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
      })),
      total,
      average: total ? sum / total : 0,
      distribution,
    };
  } catch (error) {
    // Table missing (migration not applied) or a DB hiccup — the page renders
    // its empty state and the form still works once the table exists.
    console.error("[reviews] lookup failed:", error);
    return EMPTY_SUMMARY;
  }
}

const cachedReviewSummary = unstable_cache(loadReviewSummary, ["site-reviews-v1"], {
  revalidate: 300,
  tags: ["reviews"],
});

/** Cached read for /reviews. Busted by revalidateReviews() on every write. */
export async function publicReviewSummary(): Promise<ReviewSummary> {
  const cached = await cachedReviewSummary();
  return {
    ...cached,
    reviews: cached.reviews.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      repliedAt: row.repliedAt ? new Date(row.repliedAt) : null,
    })),
  };
}
