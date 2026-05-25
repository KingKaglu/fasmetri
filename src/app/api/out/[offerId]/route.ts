import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ offerId: string }> }) {
  const fallback = new URL("/", request.url);
  if (!prisma) return Response.redirect(fallback);
  const { offerId } = await context.params;
  const offer = await prisma.productOffer.findUnique({
    where: { id: offerId },
    select: { id: true, url: true },
  }).catch(() => null);
  if (!offer) return Response.redirect(fallback);
  const target = trackedTarget(offer.url, offer.id);
  if (!target) return Response.redirect(fallback);

  try {
    await prisma.clickEvent.create({
      data: {
        offerId: offer.id,
        targetUrl: target.toString(),
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
      },
    });
  } catch {
    // Redirect remains available when analytics persistence is temporarily unavailable.
  }

  return Response.redirect(target);
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
