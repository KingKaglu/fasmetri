import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ offerId: string }> }) {
  const fallback = new URL("/", request.url);
  if (!prisma) { console.error("[out] prisma null"); return Response.redirect(fallback); }
  const { offerId } = await context.params;
  let offer: Awaited<ReturnType<typeof loadOffer>> = null;
  try {
    offer = await loadOffer(offerId);
  } catch (error) {
    console.error("[out] findUnique threw for", offerId, "::", error instanceof Error ? error.message : error);
  }
  if (!offer) { console.error("[out] offer not found for", offerId); return Response.redirect(fallback); }
  const target = trackedTarget(offer.url, offer.id);
  if (!target) return Response.redirect(fallback);

  try {
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
        // Inbound campaign tags if a campaign deep-linked through this endpoint.
        utmSource: requestUrl.searchParams.get("utm_source"),
        utmMedium: requestUrl.searchParams.get("utm_medium"),
        utmCampaign: requestUrl.searchParams.get("utm_campaign"),
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
      },
    });
  } catch {
    // Redirect remains available when analytics persistence is temporarily unavailable.
  }

  return Response.redirect(target);
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
    target.searchParams.set("utm_source", "fasmetri");
    target.searchParams.set("utm_medium", "price_comparison");
    target.searchParams.set("utm_campaign", "product_click");
    target.searchParams.set("utm_content", offerId);
    return target;
  } catch {
    return null;
  }
}
