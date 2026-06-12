import { AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/config/site";
import { activeEmailProvider, priceDropEmailHtml, sendAlertEmail } from "@/server/alerts/email";

type NotifiedVia = "none" | "console" | "resend" | "smtp";

// An email is only worth sending for a real price drop. Tiny moves that happen
// to cross the target threshold trigger the alert (recorded as AlertEvent,
// visible in /admin) but skip the email.
const MIN_DROP_PERCENT_FOR_EMAIL = 5;

export async function prepareTriggeredAlerts() {
  if (!prisma) return [];
  const alerts = await prisma.userPriceAlert.findMany({
    where: { status: AlertStatus.ACTIVE },
    include: {
      product: {
        include: {
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
            include: {
              shop: { select: { name: true } },
              histories: { orderBy: { capturedAt: "desc" }, take: 1, select: { oldPrice: true } },
            },
          },
        },
      },
    },
  });
  const triggered = alerts.filter((alert) => alert.product.offers[0] && Number(alert.product.offers[0].currentPrice) <= Number(alert.targetPrice));

  for (const alert of triggered) {
    const offer = alert.product.offers[0];
    const currentPrice = Number(offer.currentPrice);
    const targetPrice = Number(alert.targetPrice);
    const previousPrice = resolvePreviousPrice(offer, currentPrice);
    const dropPercent = previousPrice ? ((previousPrice - currentPrice) / previousPrice) * 100 : null;
    const unsubscribeUrl = `${siteUrl()}/alerts/unsubscribe/${alert.id}`;
    let notifiedVia: NotifiedVia = "none";

    // Unknown previous price means "target reached" — still worth the email.
    const meaningfulDrop = dropPercent === null || dropPercent >= MIN_DROP_PERCENT_FOR_EMAIL;

    if (activeEmailProvider() && meaningfulDrop) {
      const displayOldPrice = previousPrice ?? targetPrice;
      const html = priceDropEmailHtml({
        productName: alert.product.name,
        productUrl: `${siteUrl()}/products/${alert.product.slug}`,
        shopName: offer.shop.name,
        oldPrice: displayOldPrice,
        newPrice: currentPrice,
        savingPercent: dropPercent ?? Math.max(0, ((displayOldPrice - currentPrice) / displayOldPrice) * 100),
        unsubscribeUrl,
      });
      const provider = await sendAlertEmail(alert.email, `ფასი დაიკლო: ${alert.product.name} — ${currentPrice.toFixed(2)} ₾`, html);
      if (provider) notifiedVia = provider;
    } else if (process.env.ALERT_PROVIDER === "console") {
      console.log(`Alert ready for ${alert.email}: ${alert.product.name}; unsubscribe=${unsubscribeUrl}`);
      notifiedVia = "console";
    }

    // Always record the event so /admin can see what fired even without email.
    await prisma.alertEvent.create({
      data: {
        alertId: alert.id,
        email: alert.email,
        productId: alert.productId,
        productName: alert.product.name,
        targetPrice: alert.targetPrice,
        offerPrice: offer.currentPrice,
        shopName: offer.shop.name,
        notifiedVia,
      },
    });
  }

  await prisma.userPriceAlert.updateMany({
    where: { id: { in: triggered.map((alert) => alert.id) } },
    data: { status: AlertStatus.TRIGGERED, lastNotifiedAt: new Date() },
  });
  return triggered;
}

// Previous price for the drop calculation: the store's strike-through price
// when present, otherwise the price recorded before the latest change.
function resolvePreviousPrice(
  offer: { oldPrice: unknown; histories: { oldPrice: unknown }[] },
  currentPrice: number,
): number | null {
  const candidates = [offer.oldPrice, offer.histories[0]?.oldPrice]
    .map((value) => (value == null ? null : Number(value)))
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > currentPrice);
  return candidates.length ? Math.max(...candidates) : null;
}
