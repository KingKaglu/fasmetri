import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ offerId: string }> }) {
  const fallback = new URL("/", request.url);
  if (!prisma) return Response.redirect(fallback);
  const { offerId } = await context.params;
  const offer = await loadOffer(offerId).catch(() => null);
  if (!offer) return Response.redirect(fallback);
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

function isPublicHttpHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "::1" || host === "[::1]") return false;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return !host.includes(":");

  const [a, b] = ipv4.slice(1).map(Number);
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  return ipv4.slice(1).every((part) => Number(part) >= 0 && Number(part) <= 255);
}
