import { clientIp, isPublicHttpHost, sha256 } from "@/lib/request-ip";
import { isLikelyBot } from "@/lib/bot-detect";
import { prisma } from "@/lib/prisma";

// Fraud guards: clicks are only counted when they pass bot/IP validation,
// a per-IP rate limit and an (ip, product, hour) dedup. The redirect itself
// always works — failing a guard silently skips analytics, never the user.
const RATE_LIMIT_MAX_PER_MINUTE = 20;
const DEDUP_RETENTION_HOURS = 24;

export async function GET(request: Request, context: { params: Promise<{ offerId: string }> }) {
  const fallback = new URL("/", request.url);
  // The native app cannot follow a 302 and still control the in-app browser, so
  // ?format=json hands it the tracked URL instead. Same guards, same ClickEvent,
  // same dedup — only the response shape differs. Browsers never pass the flag,
  // so the redirect behaviour below is untouched for every existing caller.
  const wantsJson = new URL(request.url).searchParams.get("format") === "json";
  const miss = (status: number) =>
    wantsJson ? Response.json({ error: "Offer not found." }, { status }) : Response.redirect(fallback);

  if (!prisma) return miss(503);
  const { offerId } = await context.params;
  const offer = await loadOffer(offerId).catch(() => null);
  if (!offer) return miss(404);
  const target = trackedTarget(offer.url, offer.id);
  if (!target) return miss(404);

  try {
    if (await shouldCountClick(request, offer)) {
      const requestUrl = new URL(request.url);
      await prisma.clickEvent.create({
        data: {
          offerId: offer.id,
          targetUrl: target.toString(),
          productId: offer.product?.id ?? null,
          productName: offer.product?.name ?? null,
          category: offer.product?.categorySuggestedSlug ?? offer.product?.category?.slug ?? null,
          shopName: offer.shop?.name ?? null,
          price: offer.currentPrice,
          utmSource: requestUrl.searchParams.get("utm_source"),
          utmMedium: requestUrl.searchParams.get("utm_medium"),
          utmCampaign: requestUrl.searchParams.get("utm_campaign"),
          referrer: request.headers.get("referer"),
          userAgent: request.headers.get("user-agent"),
        },
      });
    }
  } catch {
    // Redirect remains available when analytics persistence is temporarily unavailable.
  }

  if (wantsJson) {
    return Response.json(
      { target: target.toString(), shop: offer.shop?.name ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.redirect(target);
}

async function shouldCountClick(request: Request, offer: { id: string; product: { id: string } | null }) {
  if (isLikelyBot(request.headers.get("user-agent"))) return false;

  const ip = clientIp(request);
  // No resolvable public IP (direct localhost hit, internal probe) → don't count.
  if (!ip || !isPublicHttpHost(ip)) return false;

  const ipHash = sha256(ip);
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const recentClicks = await prisma!.clickDedup.count({
    where: { ipHash, createdAt: { gte: oneMinuteAgo } },
  });
  if (recentClicks >= RATE_LIMIT_MAX_PER_MINUTE) return false;

  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const productKey = offer.product?.id ?? offer.id;
  const dedupKey = sha256(`${ip}|${productKey}|${hourBucket}`);
  try {
    await prisma!.clickDedup.create({ data: { dedupKey, ipHash } });
  } catch {
    // Unique violation: this IP already clicked this product within the hour.
    return false;
  }

  // Opportunistic pruning so the table stays small without a separate cron.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - DEDUP_RETENTION_HOURS * 3_600_000);
    prisma!.clickDedup.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => undefined);
  }

  return true;
}

async function loadOffer(offerId: string) {
  return prisma!.productOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      url: true,
      currentPrice: true,
      shop: { select: { name: true } },
      product: { select: { id: true, name: true, categorySuggestedSlug: true, category: { select: { slug: true } } } },
    },
  });
}

function trackedTarget(rawTarget: string, offerId: string) {
  try {
    const target = new URL(rawTarget);
    if (target.protocol !== "http:" && target.protocol !== "https:") return null;
    if (!isPublicHttpHost(target.hostname)) return null;
    target.searchParams.set("utm_source", "fasmetri");
    target.searchParams.set("utm_medium", "price_comparison");
    target.searchParams.set("utm_campaign", "product_click");
    target.searchParams.set("utm_content", offerId);
    return target;
  } catch {
    return null;
  }
}

