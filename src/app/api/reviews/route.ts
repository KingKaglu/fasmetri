import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isLikelyBot } from "@/lib/bot-detect";
import { clientIp, isPublicHttpHost, sha256 } from "@/lib/request-ip";
import { revalidateReviews } from "@/lib/revalidate";
import {
  REVIEWS_PER_IP_PER_DAY,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_NAME_MAX,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
  containsLink,
  looksLikeNoise,
  normalizeReviewBody,
} from "@/lib/review-rules";

// Anyone can post here — no account, no email, no captcha. That is the feature,
// so every guard below has to be invisible to a real visitor:
//
//   bot UA  →  honeypot  →  time trap  →  links  →  noise  →  per-IP rate limit  →  repost
//
// Failures are answered with a Georgian message the form can show, except the
// honeypot, which returns success so a bot cannot learn what tripped it.

const reviewInput = z.object({
  rating: z.number().int().min(REVIEW_RATING_MIN).max(REVIEW_RATING_MAX),
  body: z.string().trim().min(REVIEW_BODY_MIN).max(REVIEW_BODY_MAX),
  authorName: z.string().trim().max(REVIEW_NAME_MAX).optional(),
  // Honeypot: a field hidden from humans by CSS. Bots fill every input.
  website: z.string().max(200).optional(),
  // Milliseconds between the form rendering and submit.
  elapsedMs: z.number().int().nonnegative().optional(),
});

// A human cannot read the page, pick a rating and write ten characters in
// under three seconds.
const MIN_FILL_MS = 3000;

function reject(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (isLikelyBot(request.headers.get("user-agent"))) {
    return reject("მოთხოვნა ვერ დამუშავდა.", 403);
  }

  const parsed = reviewInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reject("შეავსე შეფასება და ტექსტი (მინიმუმ 10 სიმბოლო).", 400);
  }
  const { rating, body, authorName, website, elapsedMs } = parsed.data;

  // Honeypot tripped: answer 201 so the bot records a success and moves on.
  if (website && website.trim()) {
    return Response.json({ accepted: true }, { status: 201 });
  }
  if (elapsedMs !== undefined && elapsedMs < MIN_FILL_MS) {
    return reject("ცოტა ნელა — სცადე ხელახლა რამდენიმე წამში.", 429);
  }
  if (containsLink(body) || (authorName && containsLink(authorName))) {
    return reject("ბმულების დამატება არ შეიძლება. მოგვწერე ტექსტით, ბმულის გარეშე.", 422);
  }
  if (looksLikeNoise(body)) {
    return reject("დაწერე რამდენიმე სიტყვა შენი გამოცდილების შესახებ.", 422);
  }

  // No database (fixture mode): accept so the UI stays coherent in dev.
  if (!prisma) return Response.json({ accepted: true, mode: "fixture" }, { status: 202 });

  const ip = clientIp(request);
  const ipHash = ip && isPublicHttpHost(ip) ? sha256(ip) : null;

  if (ipHash) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.siteReview.count({ where: { ipHash, createdAt: { gte: since } } });
    if (recent >= REVIEWS_PER_IP_PER_DAY) {
      return reject("დღეს უკვე დატოვე შეფასება. მადლობა! სცადე ხვალ.", 429);
    }

    // Same text twice from the same place is a repost, not a second opinion.
    const normalized = normalizeReviewBody(body);
    const duplicate = await prisma.siteReview.findFirst({
      where: { ipHash, createdAt: { gte: since } },
      select: { body: true },
      orderBy: { createdAt: "desc" },
    });
    if (duplicate && normalizeReviewBody(duplicate.body) === normalized) {
      return Response.json({ accepted: true, duplicate: true }, { status: 200 });
    }
  }

  // Published on arrival — that is the point of the page. Flip
  // REVIEWS_REQUIRE_APPROVAL=1 to queue new rows in /admin/feedback instead.
  const hidden = process.env.REVIEWS_REQUIRE_APPROVAL === "1";

  await prisma.siteReview.create({
    data: {
      rating,
      body,
      authorName: authorName?.trim() ? authorName.trim() : null,
      hidden,
      ipHash,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  revalidateReviews();
  return Response.json({ accepted: true, pending: hidden }, { status: 201 });
}
